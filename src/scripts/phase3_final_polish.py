import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


CONTAMINATION_RE = re.compile(r"(gallon|pail|drum|cartridge|sausage)", re.IGNORECASE)
GRAMMAR_END_RE = re.compile(r"\b(bonds to|formulated for|designed for)\.?\s*$", re.IGNORECASE)
LEADING_BULLET_RE = re.compile(r"^\s*[\*\-\u2022]+\s*")


def collect_products(node: Any, out: List[Dict[str, Any]]) -> None:
    if isinstance(node, dict):
        if isinstance(node.get("product_id"), str):
            out.append(node)
        for value in node.values():
            collect_products(value, out)
    elif isinstance(node, list):
        for item in node:
            collect_products(item, out)


def clean_array_string(value: str) -> str:
    cleaned = LEADING_BULLET_RE.sub("", value).strip()
    return cleaned


def normalize_free_text(value: str) -> str:
    text = value.replace("\n", ", ")
    text = text.replace("*", "")
    text = re.sub(r"\s*,\s*", ", ", text)
    text = re.sub(r"\s+", " ", text).strip(" ,")
    return text


def polish_description(description: str) -> Tuple[str, bool]:
    original = description
    if not isinstance(description, str):
        return description, False

    match = GRAMMAR_END_RE.search(description)
    if not match:
        return description, False

    phrase = match.group(1).lower()
    prefix = description[: match.start(1)].rstrip(" .,:;")
    if phrase == "bonds to":
        updated = f"{prefix} bonds to a wide variety of substrates."
    else:
        updated = f"{prefix} formulated for demanding construction applications."
    return updated, updated != original


def sanitize_array(values: Any, dedupe: bool = False) -> Tuple[Any, int, int]:
    if not isinstance(values, list):
        return values, 0, 0

    cleaned_values: List[Any] = []
    cleaned_count = 0
    deduped_count = 0
    seen = set()

    for item in values:
        if isinstance(item, str):
            cleaned_item = clean_array_string(item)
            if cleaned_item != item:
                cleaned_count += 1

            if not cleaned_item:
                continue

            if dedupe:
                key = cleaned_item.lower()
                if key in seen:
                    deduped_count += 1
                    continue
                seen.add(key)

            cleaned_values.append(cleaned_item)
        else:
            cleaned_values.append(item)

    return cleaned_values, cleaned_count, deduped_count


def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 3 final polish for product JSON data.")
    parser.add_argument(
        "--file",
        default=r"E:\Downloads\01_Projects\WebProjects\PMST\data\forza_products_organized.json",
        help="Path to forza_products_organized.json",
    )
    args = parser.parse_args()

    target_path = Path(args.file)
    data = json.loads(target_path.read_text(encoding="utf-8"))

    products: List[Dict[str, Any]] = []
    collect_products(data, products)

    description_fixes = 0
    array_clean_fixes = 0
    sizing_dedupes = 0
    contaminated_field_clears = 0
    free_text_cleanups = 0
    ra2000_color_cleared = False

    for product in products:
        # Regex grammar fixes
        description = product.get("description")
        if isinstance(description, str):
            updated_desc, changed = polish_description(description)
            if changed:
                product["description"] = updated_desc
                description_fixes += 1

        # Array sanitization
        for key in ("sizing", "benefits", "applications"):
            dedupe = key == "sizing"
            cleaned_array, cleaned_count, deduped_count = sanitize_array(product.get(key), dedupe=dedupe)
            if isinstance(product.get(key), list):
                product[key] = cleaned_array
            array_clean_fixes += cleaned_count
            sizing_dedupes += deduped_count

        # Force-clear contaminated fields and normalize formatting in color/cleanup
        for key in ("color", "cleanup"):
            value = product.get(key)
            if not isinstance(value, str):
                continue

            original = value
            normalized = normalize_free_text(original)

            if CONTAMINATION_RE.search(normalized):
                product[key] = ""
                contaminated_field_clears += 1
                if product.get("product_id") == "R-A2000" and key == "color":
                    ra2000_color_cleared = True
                continue

            if normalized != original:
                product[key] = normalized
                free_text_cleanups += 1

    target_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Updated file: {target_path}")
    print(f"Description regex fixes: {description_fixes}")
    print(f"Array item cleanups: {array_clean_fixes}")
    print(f"Sizing deduplications: {sizing_dedupes}")
    print(f"Contaminated color/cleanup clears: {contaminated_field_clears}")
    print(f"Color/cleanup formatting cleanups: {free_text_cleanups}")
    print(f"R-A2000 color cleared: {'YES' if ra2000_color_cleared else 'NO'}")


if __name__ == "__main__":
    main()

