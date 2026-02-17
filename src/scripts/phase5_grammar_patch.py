import json
from pathlib import Path
from typing import Any, Dict, List


# Path to your organized data
FILE_PATH = Path(r"E:\Downloads\01_Projects\WebProjects\PMST\data\forza_products_organized.json")

# Exact patch list source generated from the approved Phase 5 review list.
# This file contains product_id/field/index/before/after entries.
PATCH_SOURCE = Path(r"E:\Downloads\01_Projects\WebProjects\PMST\phase5_leadin_review_report.json")


def collect_products(node: Any, out: List[Dict[str, Any]]) -> None:
    if isinstance(node, dict):
        if isinstance(node.get("product_id"), str):
            out.append(node)
        for value in node.values():
            collect_products(value, out)
    elif isinstance(node, list):
        for item in node:
            collect_products(item, out)


def load_patches() -> List[Dict[str, Any]]:
    raw = json.loads(PATCH_SOURCE.read_text(encoding="utf-8"))
    patches: List[Dict[str, Any]] = []
    for item in raw:
        if all(k in item for k in ("product_id", "field", "index", "before", "after")):
            patches.append(
                {
                    "product_id": item["product_id"],
                    "field": item["field"],
                    "index": item["index"],
                    "before": item["before"],
                    "after": item["after"],
                }
            )
    return patches


def main() -> None:
    print(f"Loading data from {FILE_PATH}...")
    data = json.loads(FILE_PATH.read_text(encoding="utf-8"))

    print(f"Loading patch list from {PATCH_SOURCE}...")
    patches = load_patches()
    print(f"Loaded {len(patches)} patches.")

    products: List[Dict[str, Any]] = []
    collect_products(data, products)
    product_map = {p["product_id"]: p for p in products}

    applied_count = 0
    already_correct_count = 0
    not_found_count = 0

    print("Applying patches...")
    for patch in patches:
        pid = patch["product_id"]
        field = patch["field"]
        index = patch["index"]
        target_str = patch["before"]
        replacement_str = patch["after"]

        product = product_map.get(pid)
        if not product:
            print(f"Warning: Product ID {pid} not found.")
            not_found_count += 1
            continue

        values = product.get(field)
        if not isinstance(values, list):
            print(f"Warning: Field '{field}' in {pid} is missing or not a list.")
            not_found_count += 1
            continue

        # Primary: index-aware exact replacement
        if 0 <= index < len(values):
            current = values[index]
            if current == replacement_str:
                already_correct_count += 1
                continue
            if current == target_str:
                values[index] = replacement_str
                applied_count += 1
                continue

        # Fallback: exact search in the same field list
        found_at = next((i for i, item in enumerate(values) if item == target_str), -1)
        if found_at != -1:
            values[found_at] = replacement_str
            applied_count += 1
            continue

        # If target is already gone and replacement not present, report for manual review
        if replacement_str in values:
            already_correct_count += 1
        else:
            print(f"Notice: No exact match found for {pid} [{field}] index {index}")
            not_found_count += 1

    print("Patching complete.")
    print(f"Applied updates: {applied_count}")
    print(f"Already correct: {already_correct_count}")
    print(f"Not found/skipped: {not_found_count}")

    print(f"Saving updated data to {FILE_PATH}...")
    FILE_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Done.")


if __name__ == "__main__":
    main()

