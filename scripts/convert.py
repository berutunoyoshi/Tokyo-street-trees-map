#!/usr/bin/env python3
"""街路樹CSV → アプリ用のコンパクトJSON (data/trees.json) に変換するスクリプト。

使い方:
    python3 scripts/convert.py raw/tokyo_gairoju.csv data/trees.json

- 入力CSVの文字コードは Shift_JIS(CP932) / UTF-8(BOM付き含む) を自動判別します。
- 文字列項目は辞書化（重複排除）し、列ごとの配列で保存してファイルサイズを抑えます。
- 樹木ID は CSV の行番号（0始まり）です。データ更新時はIDが変わる点に注意してください。
外部ライブラリは不要です（Python 3.8+ 標準ライブラリのみ）。
"""
import csv
import io
import json
import sys
from datetime import date

COLS = {
    "sp": "樹種", "cat": "区分", "h": "樹高(m)", "w": "枝張(m)", "g": "幹周(cm）",
    "ward": "行政区", "type": "種別", "no": "整理番号", "route": "路線名",
    "road": "通称道路名", "x": "経度", "y": "緯度",
}
DICT_COLS = ["sp", "cat", "ward", "type", "route", "road"]
FLOAT_COLS = ["h", "w", "g"]


def read_text(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp932"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise SystemExit("文字コードを判別できませんでした")


def norm_header(h):
    # 全角/半角括弧の揺れを吸収
    return h.strip().replace("（", "(").replace("）", ")")


def num(v):
    v = (v or "").strip()
    if v == "":
        return None
    f = float(v)
    return int(f) if f.is_integer() else round(f, 2)


def main(src, dst):
    reader = csv.reader(io.StringIO(read_text(src)))
    header = [norm_header(h) for h in next(reader)]
    idx = {}
    for key, name in COLS.items():
        n = norm_header(name)
        if n not in header:
            raise SystemExit(f"列が見つかりません: {name}")
        idx[key] = header.index(n)

    dicts = {k: [] for k in DICT_COLS}
    lookup = {k: {} for k in DICT_COLS}
    cols = {k: [] for k in COLS}
    skipped = 0
    for row in reader:
        if not row or len(row) < len(header):
            skipped += 1
            continue
        try:
            x, y = float(row[idx["x"]]), float(row[idx["y"]])
        except ValueError:
            skipped += 1
            continue
        for k in DICT_COLS:
            v = row[idx[k]].strip()
            if v == "":
                cols[k].append(-1)
                continue
            if v not in lookup[k]:
                lookup[k][v] = len(dicts[k])
                dicts[k].append(v)
            cols[k].append(lookup[k][v])
        for k in FLOAT_COLS:
            cols[k].append(num(row[idx[k]]))
        cols["no"].append(num(row[idx["no"]]))
        cols["x"].append(round(x, 6))
        cols["y"].append(round(y, 6))

    out = {
        "version": 1,
        "generated": date.today().isoformat(),
        "count": len(cols["x"]),
        "dict": dicts,
        "cols": cols,
    }
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{out['count']} 件を書き出しました → {dst}（スキップ {skipped} 行）")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
