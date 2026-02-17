import datetime
import json
from pathlib import Path
from typing import Any, Dict, List


CURRENT_JSON = Path(r"E:\Downloads\01_Projects\WebProjects\PMST\data\forza_products_organized.json")
LIVE_BACKUP_JSON = Path(
    r"E:\Downloads\01_Projects\WebProjects\PMST\backend\data\backups\heroku-products-live-backup-20260217-172529.json"
)
SNAPSHOT_DIR = Path(r"E:\Downloads\01_Projects\WebProjects\PMST\backend\data\backups")


def collect_products(node: Any, out: List[Dict[str, Any]]) -> None:
    if isinstance(node, dict):
        if isinstance(node.get("product_id"), str):
            out.append(node)
        for value in node.values():
            collect_products(value, out)
    elif isinstance(node, list):
        for item in node:
            collect_products(item, out)


def main() -> None:
    current = json.loads(CURRENT_JSON.read_text(encoding="utf-8"))
    backup_live = json.loads(LIVE_BACKUP_JSON.read_text(encoding="utf-8"))

    snapshot_path = SNAPSHOT_DIR / (
        f"forza_products_organized_before_benefits_restore_{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    )
    snapshot_path.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    current_products: List[Dict[str, Any]] = []
    collect_products(current, current_products)
    current_map = {p["product_id"]: p for p in current_products}
    backup_map = {
        p["product_id"]: p
        for p in backup_live
        if isinstance(p, dict) and isinstance(p.get("product_id"), str)
    }

    restored: List[str] = []
    for product_id, backup_product in backup_map.items():
        backup_benefits = backup_product.get("benefits") or []
        current_product = current_map.get(product_id)
        if not current_product:
            continue
        current_benefits = current_product.get("benefits") or []

        if isinstance(backup_benefits, list) and len(backup_benefits) > 0 and isinstance(current_benefits, list) and len(current_benefits) == 0:
            current_product["benefits"] = backup_benefits
            restored.append(product_id)

    CURRENT_JSON.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Snapshot saved: {snapshot_path}")
    print(f"Restored benefits for {len(restored)} products")
    if restored:
        print(",".join(sorted(restored)))


if __name__ == "__main__":
    main()

