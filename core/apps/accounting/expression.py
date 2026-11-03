from __future__ import annotations

import ast
from decimal import Decimal, InvalidOperation
from typing import Mapping


class SafeExpressionError(ValueError):
    pass


_ALLOWED_BINARY = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b,
}

_ALLOWED_UNARY = {
    ast.UAdd: lambda value: value,
    ast.USub: lambda value: -value,
}

_MAX_AST_NODES = 64


def _to_decimal(value) -> Decimal:
    if isinstance(value, bool):
        raise SafeExpressionError("Boolean values are not allowed.")

    if isinstance(value, Decimal):
        return value

    if isinstance(value, int):
        return Decimal(value)

    if isinstance(value, float):
        return Decimal(str(value))

    if isinstance(value, str):
        try:
            return Decimal(value)
        except InvalidOperation as exc:
            raise SafeExpressionError(
                "String value is not a valid decimal number."
            ) from exc

    raise SafeExpressionError(
        f"Unsupported numeric value type: {type(value).__name__}"
    )


def evaluate_amount_expression(
    expression: str,
    variables: Mapping[str, object],
) -> Decimal:
    """
    Evaluate a small arithmetic expression safely.

    Allowed:
      - decimal/integer numeric literals
      - named variables supplied by the caller
      - +, -, *, /
      - unary + and -
      - parentheses

    Function calls, attribute access, indexing, comprehensions, comparisons,
    booleans, power, floor division, modulo, and Python eval/exec are rejected.
    """
    if not isinstance(expression, str) or not expression.strip():
        raise SafeExpressionError("Expression must be a non-empty string.")

    try:
        tree = ast.parse(
            expression,
            mode="eval",
        )
    except SyntaxError as exc:
        raise SafeExpressionError(
            "Invalid expression syntax."
        ) from exc

    if sum(1 for _ in ast.walk(tree)) > _MAX_AST_NODES:
        raise SafeExpressionError(
            "Expression is too complex."
        )

    normalized = {
        str(name): _to_decimal(value)
        for name, value in variables.items()
    }

    def visit(node) -> Decimal:
        if isinstance(node, ast.Expression):
            return visit(node.body)

        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)) and not isinstance(
                node.value,
                bool,
            ):
                return _to_decimal(node.value)

            raise SafeExpressionError(
                "Only numeric literals are allowed."
            )

        if isinstance(node, ast.Name):
            if node.id not in normalized:
                raise SafeExpressionError(
                    f"Unknown variable: {node.id}"
                )
            return normalized[node.id]

        if isinstance(node, ast.BinOp):
            operator = _ALLOWED_BINARY.get(
                type(node.op)
            )
            if operator is None:
                raise SafeExpressionError(
                    "Operator is not allowed."
                )

            left = visit(node.left)
            right = visit(node.right)

            try:
                return operator(
                    left,
                    right,
                )
            except Exception as exc:
                raise SafeExpressionError(
                    "Arithmetic operation failed."
                ) from exc

        if isinstance(node, ast.UnaryOp):
            operator = _ALLOWED_UNARY.get(
                type(node.op)
            )
            if operator is None:
                raise SafeExpressionError(
                    "Unary operator is not allowed."
                )
            return operator(
                visit(node.operand)
            )

        raise SafeExpressionError(
            f"Expression node is not allowed: {type(node).__name__}"
        )

    return visit(tree)
