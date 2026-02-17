import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple


SKIP_IDS = {"T-OS150", "TU-FS10"}
COLOR_SIZE_KEYWORDS = ("gallon", "pail", "drum", "cartridge", "sausage")


def collect_products(node: Any, out: List[Dict[str, Any]]) -> None:
    if isinstance(node, dict):
        if isinstance(node.get("product_id"), str):
            out.append(node)
        for value in node.values():
            collect_products(value, out)
    elif isinstance(node, list):
        for item in node:
            collect_products(item, out)


def normalize_description(description: str) -> Tuple[str, bool]:
    updated = description
    changed = False

    if updated.endswith(" bonds to."):
        updated = updated[: -len(" bonds to.")] + " bonds to a wide variety of substrates."
        changed = True
    elif updated.endswith(" formulated for.") or updated.endswith(" designed for."):
        suffix = " formulated for." if updated.endswith(" formulated for.") else " designed for."
        updated = updated[: -len(suffix)] + " formulated for demanding construction applications."
        changed = True

    return updated, changed


def split_size_values(raw_value: str) -> List[str]:
    parts = [part.strip() for part in re.split(r"[,\n;/]+", raw_value) if part.strip()]
    return parts or [raw_value.strip()]


def clean_bullet_prefix(text: str) -> Tuple[str, bool]:
    cleaned = re.sub(r"^\s*[\*\-]+\s*", "", text)
    cleaned = cleaned.lstrip()
    return cleaned, cleaned != text


def run_cleanup(target_json_path: Path) -> Dict[str, int]:
    data = json.loads(target_json_path.read_text(encoding="utf-8"))
    products: List[Dict[str, Any]] = []
    collect_products(data, products)

    grammar_fixes = 0
    contamination_fixes = 0
    bullet_fixes = 0

    for product in products:
        product_id = (product.get("product_id") or "").strip()
        if not product_id or product_id in SKIP_IDS:
            continue

        description = product.get("description")
        if isinstance(description, str):
            updated_description, changed = normalize_description(description)
            if changed:
                product["description"] = updated_description
                grammar_fixes += 1

        color = product.get("color")
        if isinstance(color, str) and color.strip():
            color_str = color.strip()
            if any(keyword in color_str.lower() for keyword in COLOR_SIZE_KEYWORDS):
                sizing = product.get("sizing")
                if not isinstance(sizing, list):
                    sizing = []
                    product["sizing"] = sizing

                existing_sizes: Set[str] = {str(entry).strip().lower() for entry in sizing if str(entry).strip()}
                moved_any = False
                for size_value in split_size_values(color_str):
                    normalized = size_value.strip()
                    if not normalized:
                        continue
                    if normalized.lower() not in existing_sizes:
                        sizing.append(normalized)
                        existing_sizes.add(normalized.lower())
                    moved_any = True

                product["color"] = ""
                if moved_any:
                    contamination_fixes += 1

        for list_key in ("benefits", "applications"):
            values = product.get(list_key)
            if not isinstance(values, list):
                continue

            updated_values: List[Any] = []
            list_changed = False
            for item in values:
                if isinstance(item, str):
                    cleaned, changed = clean_bullet_prefix(item)
                    updated_values.append(cleaned)
                    if changed:
                        list_changed = True
                        bullet_fixes += 1
                else:
                    updated_values.append(item)

            if list_changed:
                product[list_key] = updated_values

    target_json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return {
        "grammar_fixes": grammar_fixes,
        "field_contamination_fixes": contamination_fixes,
        "bullet_format_fixes": bullet_fixes,
        "products_scanned": len(products),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 2 data perfection cleanup for product JSON.")
    parser.add_argument(
        "--file",
        default=r"E:\Downloads\01_Projects\WebProjects\PMST\data\forza_products_organized.json",
        help="Path to forza_products_organized.json",
    )
    args = parser.parse_args()

    target_path = Path(args.file)
    summary = run_cleanup(target_path)
    print(f"Updated file: {target_path}")
    print(f"Grammar fixes: {summary['grammar_fixes']}")
    print(f"Field contamination fixes: {summary['field_contamination_fixes']}")
    print(f"Bullet formatting fixes: {summary['bullet_format_fixes']}")
    print(f"Products scanned: {summary['products_scanned']}")


if __name__ == "__main__":
    main()

