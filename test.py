cases = [
    ("KeyError",          lambda: {}["x"]),
    ("IndexError",        lambda: [1][5]),
    ("AttributeError",    lambda: None.foo),
    ("NameError",         lambda: undefined_var),
    ("TypeError",         lambda: "1" + 1),
    ("ValueError",        lambda: int("abc")),
    ("ZeroDivisionError", lambda: 1 / 0),
]

for name, fn in cases:
    try:
        fn()
    except Exception as e:
        print(f"{name:20} → {type(e).__name__}: {e}")