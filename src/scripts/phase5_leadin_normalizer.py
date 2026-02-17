import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple


TARGET_PATH = Path(r"E:\Downloads\01_Projects\WebProjects\PMST\data\forza_products_organized.json")
REPORT_PATH = Path(r"E:\Downloads\01_Projects\WebProjects\PMST\phase5_leadin_review_report.json")


def collect_products(node: Any, out: List[Dict[str, Any]]) -> None:
    if isinstance(node, dict):
        if isinstance(node.get("product_id"), str):
            out.append(node)
        for value in node.values():
            collect_products(value, out)
    elif isinstance(node, list):
        for item in node:
            collect_products(item, out)


def _replace_suffix(original: str, suffix_regex: str, replacement: str) -> Tuple[str, bool]:
    updated = re.sub(suffix_regex, replacement, original, flags=re.IGNORECASE)
    return updated, updated != original


def normalize_lead_in(text: str, has_following_items: bool) -> Tuple[str, bool, str]:
    value = text.strip()
    lower = value.lower()

    if "the following" in lower:
        return text, False, ""

    replacements = [
        (r"\bsuch as\s*:?\s*$", "such as the following:", "such_as"),
        (r"\bincluding\s*:?\s*$", "including the following:", "including"),
        (r"\bapplications include\s*:?\s*$", "applications include the following:", "applications_include"),
        (r"\bspecific applications include\s*:?\s*$", "specific applications include the following:", "specific_applications_include"),
        (r"\bbonds to\s*:?\s*$", "bonds to the following substrates:", "bonds_to"),
        (r"\balso bonds to\s*:?\s*$", "also bonds to the following substrates:", "also_bonds_to"),
        (r"\bused for\s*:?\s*$", "used for the following applications:", "used_for"),
        (r"\bideal for\s*:?\s*$", "ideal for the following applications:", "ideal_for"),
        (r"\bcompatible with\s*:?\s*$", "compatible with the following:", "compatible_with"),
        (r"\bdesigned for\s*:?\s*$", "designed for the following applications:", "designed_for"),
        (r"\bformulated for\s*:?\s*$", "formulated for the following applications:", "formulated_for"),
        (r"\busing\s*:?\s*$", "using the following materials:", "using"),
        (r"\bthis includes\s*:?\s*$", "this includes the following:", "this_includes"),
        (r"\binclude\s*:?\s*$", "include the following:", "include"),
    ]

    for pattern, replacement, reason in replacements:
        updated, changed = _replace_suffix(value, pattern, replacement)
        if changed:
            return updated, True, reason

    # Fallback for trailing colon while preserving the phrase.
    if value.endswith(":"):
        if has_following_items:
            return value[:-1].rstrip() + ". The following are typical applications:", True, "colon_fallback_with_context"
        return value[:-1].rstrip() + ".", True, "colon_fallback_plain"

    return text, False, ""


def main() -> None:
    data = json.loads(TARGET_PATH.read_text(encoding="utf-8"))
    products: List[Dict[str, Any]] = []
    collect_products(data, products)

    report: List[Dict[str, Any]] = []
    changes = 0

    for product in products:
        applications = product.get("applications")
        if not isinstance(applications, list):
            continue

        for idx, item in enumerate(applications):
            if not isinstance(item, str):
                continue

            stripped = item.strip()
            # Only touch potential lead-in rows.
            if not (
                stripped.endswith(":")
                or re.search(r"\b(such as|including|include|applications include|bonds to|used for|ideal for|compatible with|using|designed for|formulated for)\s*:?$", stripped, re.IGNORECASE)
            ):
                continue

            has_following = idx < len(applications) - 1
            updated, changed, reason = normalize_lead_in(stripped, has_following)
            if changed and updated != stripped:
                applications[idx] = updated
                changes += 1
                report.append(
                    {
                        "product_id": product.get("product_id"),
                        "field": "applications",
                        "index": idx,
                        "reason": reason,
                        "before": stripped,
                        "after": updated,
                    }
                )

    TARGET_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Updated file: {TARGET_PATH}")
    print(f"Lead-in replacements: {changes}")
    print(f"Review report: {REPORT_PATH}")


if __name__ == "__main__":
    main()

