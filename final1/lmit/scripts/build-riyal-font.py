"""Maintenance tool: convert official SAMA SVG geometry to a local font.
Requires fontTools. Not used in deployment or the application.
Original: https://www.sama.gov.sa/ar-sa/Currency/Documents/Saudi_Riyal_Symbol-2.svg
"""
from pathlib import Path
import xml.etree.ElementTree as ET
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.svgLib.path import parse_path

root = Path(__file__).resolve().parents[1]
svg = ET.parse(root / "public/brand/saudi-riyal.svg").getroot()
scale = 720 / 1256.39
pen = TTGlyphPen(None)
transformed = TransformPen(Cu2QuPen(pen, max_err=0.5, reverse_direction=True), (scale, 0, 0, -scale, 50, 720))
for element in svg:
    if element.tag.endswith("path"):
        parse_path(element.attrib["d"], transformed)
font = FontBuilder(1000, isTTF=True)
font.setupGlyphOrder([".notdef", "riyal"])
font.setupCharacterMap({0x20C1: "riyal"})
font.setupGlyf({".notdef": TTGlyphPen(None).glyph(), "riyal": pen.glyph()})
font.setupHorizontalMetrics({".notdef": (500, 0), "riyal": (round(1124.14 * scale + 100), 50)})
font.setupHorizontalHeader(ascent=1000, descent=-250)
font.setupOS2(sTypoAscender=1000, sTypoDescender=-250, usWinAscent=1000, usWinDescent=250)
font.setupNameTable({
    "familyName": "LMIT Riyal", "styleName": "Regular",
    "uniqueFontIdentifier": "LMITRiyal-SAMA-2025", "fullName": "LMIT Riyal", "psName": "LMITRiyal",
    "description": "Saudi Central Bank official Saudi riyal symbol geometry.",
})
font.setupPost()
font.font.flavor = "woff"
font.save(root / "public/fonts/saudi-riyal.woff")
print("Generated the local Saudi riyal compatibility font.")
