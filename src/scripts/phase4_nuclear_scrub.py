import json
import re
from pathlib import Path
from typing import Any, Dict, List


TARGET_PATH = Path(r"E:\Downloads\01_Projects\WebProjects\PMST\data\forza_products_organized.json")
SIZE_KEYWORDS_RE = re.compile(r"(gallon|pail|drum|cartridge|sausage)", re.IGNORECASE)


def collect_products(node: Any, out: List[Dict[str, Any]]) -> None:
    if isinstance(node, dict):
        if isinstance(node.get("product_id"), str):
            out.append(node)
        for value in node.values():
            collect_products(value, out)
    elif isinstance(node, list):
        for item in node:
            collect_products(item, out)


def clean_text(value: str) -> str:
    cleaned = value.replace("\n", ", ")
    cleaned = cleaned.replace("*", "")
    cleaned = cleaned.replace("- ", "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = re.sub(r"\s*,\s*", ", ", cleaned)
    return cleaned.strip(" ,")


def dedupe_list(items: List[Any]) -> List[Any]:
    seen = set()
    deduped: List[Any] = []
    for item in items:
        key = item.lower() if isinstance(item, str) else item
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def main() -> None:
    data = json.loads(TARGET_PATH.read_text(encoding="utf-8"))
    products: List[Dict[str, Any]] = []
    collect_products(data, products)

    # 1) R-A2000 targeted fix
    for product in products:
        if product.get("product_id") == "R-A2000":
            product["color"] = ""
            product["sizing"] = ["5 Gallon Pail", "55 Gallon Drum", "Tote"]

    # 2) IC932 targeted fix
    for product in products:
        if product.get("product_id") == "IC932":
            product["description"] = "Permanently bonds to a wide variety of substrates."

    # 3) Nuclear cleanup on target fields
    for product in products:
        for field in ("color", "cleanup", "sizing", "benefits", "applications"):
            value = product.get(field)
            if isinstance(value, str):
                product[field] = clean_text(value)
            elif isinstance(value, list):
                cleaned_list: List[Any] = []
                for item in value:
                    if isinstance(item, str):
                        cleaned = clean_text(item)
                        if cleaned:
                            cleaned_list.append(cleaned)
                    elif item is not None:
                        cleaned_list.append(item)
                product[field] = dedupe_list(cleaned_list)

    # 4) Global sizing migration fail-safe
    for product in products:
        color = product.get("color")
        if isinstance(color, str) and color and SIZE_KEYWORDS_RE.search(color):
            if not isinstance(product.get("sizing"), list):
                product["sizing"] = []
            product["sizing"].append(clean_text(color))
            product["sizing"] = dedupe_list(
                [clean_text(item) for item in product["sizing"] if isinstance(item, str) and clean_text(item)]
            )
            product["color"] = ""

    TARGET_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    ra2000 = next((p for p in products if p.get("product_id") == "R-A2000"), None)
    ic932 = next((p for p in products if p.get("product_id") == "IC932"), None)

    print("R-A2000_JSON_START")
    print(json.dumps(ra2000, indent=2, ensure_ascii=False))
    print("R-A2000_JSON_END")
    print("IC932_JSON_START")
    print(json.dumps(ic932, indent=2, ensure_ascii=False))
    print("IC932_JSON_END")


if __name__ == "__main__":
    main()

