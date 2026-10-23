"""Offline, deterministic candidate generation; never imported by the game.

Connected regions grow from non-touching answer seeds. Reject non-unique maps.
Rank by remaining candidates after singles/locked-unit deduction, then the
number of minimum-domain search decisions: a reasoning proxy, not playtime.
"""
import itertools
import json
import random
from pathlib import Path


def solutions(n, regions, limit=2):
    found = []
    columns = []

    def visit(row, used_columns, used_regions):
        if len(found) >= limit:
            return
        if row == n:
            found.append(columns[:])
            return
        for col in range(n):
            region = regions[row * n + col]
            if col in used_columns or region in used_regions:
                continue
            if columns and abs(columns[-1] - col) <= 1:
                continue
            columns.append(col)
            visit(row + 1, used_columns | {col}, used_regions | {region})
            columns.pop()

    visit(0, set(), set())
    return found


def deduction(n, regions, candidates):
    units = [{r * n + c for c in range(n)} for r in range(n)]
    units += [{r * n + c for r in range(n)} for c in range(n)]
    units += [{i for i, reg in enumerate(regions) if reg == k} for k in range(n)]
    candidates = set(candidates)
    rounds = 0
    while True:
        before = set(candidates)
        for unit in units:
            available = unit & candidates
            if not available:
                return None, rounds
            if len(available) == 1:
                cell = next(iter(available))
                row, col = divmod(cell, n)
                candidates -= {
                    i for i in candidates if i != cell and (
                        i // n == row or i % n == col or regions[i] == regions[cell]
                        or (abs(i // n - row) <= 1 and abs(i % n - col) <= 1)
                    )
                }
            # If every possible cat in one unit belongs to another unit,
            # that intersection owns the latter unit's cat.
            for other in units:
                if available <= other:
                    candidates -= other - unit
        if candidates == before:
            return candidates, rounds
        rounds += 1


def difficulty(n, regions):
    initial, rounds = deduction(n, regions, set(range(n * n)))
    if initial is None:
        raise ValueError('Unique candidate contradicted by deduction')
    decisions = 0
    depth = 0

    def search(candidates, level):
        nonlocal decisions, depth
        candidates, _ = deduction(n, regions, candidates)
        if candidates is None:
            return
        if len(candidates) == n:
            return
        depth = max(depth, level + 1)
        decisions += 1
        rows = [sorted(i for i in candidates if i // n == r) for r in range(n)]
        branch = min((row for row in rows if len(row) > 1), key=len)
        for cell in branch:
            search(candidates - set(branch) | {cell}, level + 1)

    search(initial, 0)
    return {'remaining': len(initial) - n, 'decisions': decisions, 'depth': depth, 'rounds': rounds}


def generate_pool(n, count, seed):
    rnd = random.Random(seed)
    answers = [list(p) for p in itertools.permutations(range(n))
               if all(abs(p[r] - p[r + 1]) > 1 for r in range(n - 1))]
    pool = []
    seen = set()
    attempts = 0
    while len(pool) < count:
        attempts += 1
        answer = rnd.choice(answers)
        regions = [-1] * (n * n)
        for row, col in enumerate(answer):
            regions[row * n + col] = row
        frontier = set(range(n * n)) - {r * n + c for r, c in enumerate(answer)}
        while frontier:
            options = []
            for cell in sorted(frontier):
                r, c = divmod(cell, n)
                neighbors = [regions[rr * n + cc] for rr, cc in
                             ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1))
                             if 0 <= rr < n and 0 <= cc < n and regions[rr * n + cc] >= 0]
                if neighbors:
                    options.append((cell, neighbors))
            cell, neighbors = rnd.choice(options)
            regions[cell] = rnd.choice(neighbors)
            frontier.remove(cell)
        if n == 6 and min(regions.count(k) for k in range(n)) < 2:
            continue
        signature = tuple(regions)
        if signature in seen or solutions(n, regions) != [answer]:
            continue
        seen.add(signature)
        metrics = difficulty(n, regions)
        pool.append({'size': n, 'regions': [''.join(str(k) for k in regions[r*n:(r+1)*n]) for r in range(n)],
                     'solution': answer, 'metrics': metrics})
    print(f'{n}x{n}: {count} unique candidates from {attempts} attempts', flush=True)
    return pool


def expand_large_boards(count):
    # Boundary mutations avoid the very low yield of unconstrained 8x8 growth.
    originals = json.loads(Path('src/game/fixtures/original-levels.json').read_text())
    bases = [p for p in originals if p['size'] == 8]
    rnd = random.Random(20261030)
    pool, seen = [], set()

    def connected(regions):
        for region in range(8):
            cells = {i for i, value in enumerate(regions) if value == region}
            if not cells:
                return False
            reached, queue = set(), [min(cells)]
            while queue:
                cell = queue.pop()
                if cell in reached:
                    continue
                reached.add(cell)
                r, c = divmod(cell, 8)
                queue += [rr * 8 + cc for rr, cc in ((r-1,c),(r+1,c),(r,c-1),(r,c+1))
                          if 0 <= rr < 8 and 0 <= cc < 8 and rr * 8 + cc in cells - reached]
            if reached != cells:
                return False
        return True

    while len(pool) < count:
        base = rnd.choice(bases)
        regions = base['regions'][:]
        seeds = {r * 8 + c for r, c in enumerate(base['solution'])}
        changes = 0
        for _ in range(100):
            cell = rnd.randrange(64)
            if cell in seeds:
                continue
            r, c = divmod(cell, 8)
            neighbors = [regions[rr*8+cc] for rr,cc in ((r-1,c),(r+1,c),(r,c-1),(r,c+1))
                         if 0<=rr<8 and 0<=cc<8 and regions[rr*8+cc] != regions[cell]]
            if not neighbors:
                continue
            candidate = regions[:]
            candidate[cell] = rnd.choice(neighbors)
            if connected(candidate) and solutions(8, candidate) == [base['solution']]:
                regions = candidate
                changes += 1
        signature = tuple(regions)
        if changes < 8 or signature in seen:
            continue
        seen.add(signature)
        pool.append({'size': 8, 'regions': [''.join(map(str, regions[r*8:(r+1)*8])) for r in range(8)],
                     'solution': base['solution'], 'metrics': difficulty(8, regions)})
    print(f'8x8: {count} unique connected boundary-remodeled candidates', flush=True)
    return pool


if __name__ == '__main__':
    pool = []
    for size in (6, 7):
        pool += generate_pool(size, 60, 20261022 + size)
        Path('/tmp/purrzle-candidates.json').write_text(json.dumps(pool, indent=2))
    pool += expand_large_boards(60)
    Path('/tmp/purrzle-candidates.json').write_text(json.dumps(pool, indent=2))
    for size in (6, 7, 8):
        items = [p['metrics'] for p in pool if p['size'] == size]
        print(size, sorted(items, key=lambda m: (m['decisions'], m['remaining']))[::10])