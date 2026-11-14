#!/usr/bin/env python3
"""Dump full document content in order: paragraphs, tables (with empty cells visible), images."""
import sys, os
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

def iter_block_items(parent):
    from docx.oxml.ns import qn
    for child in parent.element.body.iterchildren():
        if child.tag == qn('w:p'):
            yield Paragraph(child, parent)
        elif child.tag == qn('w:tbl'):
            yield Table(child, parent)

def dump(path, out):
    doc = Document(path)
    lines = []
    tbl_idx = 0
    for block in iter_block_items(doc):
        if isinstance(block, Paragraph):
            t = block.text
            has_img = 'graphicData' in block._p.xml or 'imagedata' in block._p.xml
            if t.strip():
                lines.append(t)
            elif has_img:
                lines.append('[[IMAGE IN PARAGRAPH]]')
        else:
            tbl_idx += 1
            lines.append(f'<<<TABLE {tbl_idx}: {len(block.rows)} rows x {len(block.columns)} cols>>>')
            for ri, row in enumerate(block.rows):
                cells = []
                for cell in row.cells:
                    txt = cell.text.replace('\n', '\\n')
                    cells.append(txt)
                lines.append(f'  R{ri}: [' + ' | '.join(cells) + ']')
            lines.append(f'<<<END TABLE {tbl_idx}>>>')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'{os.path.basename(path)}: {len(lines)} lines -> {out}')

if __name__ == '__main__':
    base = '/home/z/my-project/upload'
    outdir = '/home/z/my-project/scripts/extract'
    files = ['UNIT-1 QB.docx', 'Unit-2 QB.docx', 'UNIT -III QB.docx', 'UNIT-4 QB.docx', 'UNIT V-QB.docx']
    for fn in files:
        dump(os.path.join(base, fn), os.path.join(outdir, fn.replace('.docx', '.dump.txt')))
