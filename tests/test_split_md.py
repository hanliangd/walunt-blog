from rag_index import split_md


def test_split_md_no_heading():
    text = "这是一段没有标题的纯文本。" * 10
    result = split_md(text)
    expect = [("（全文）", text.strip())]
    assert result == expect


def test_no_heading_short_text():
    text = "太短了"
    result = split_md(text)
    assert result == []


def test_with_h1_and_headings():
    text = """
# 这是一个H1大标题
这是一段足够长的前言内容，用来测试前言切分。

## 第一章
这是第一章的正文内容,应该超过20个字符才能被切块
"""
    result = split_md(text)
    expect = [
        ("（前言）", "这是一段足够长的前言内容，用来测试前言切分。"),
        ("第一章", "第一章\n\n这是第一章的正文内容,应该超过20个字符才能被切块"),
    ]
    assert result == expect


def test_with_headings_only():
    text = """
## 第二章
只有二级标题和内容,内容必须超过20个字符才不会被过滤。

## 第三章
且内容足够长,内容必须超过20个字符才不会被过滤。
"""
    result = split_md(text)
    expect = [
        ("第二章", "第二章\n\n只有二级标题和内容,内容必须超过20个字符才不会被过滤。"),
        ("第三章", "第三章\n\n且内容足够长,内容必须超过20个字符才不会被过滤。"),
    ]
    assert result == expect
