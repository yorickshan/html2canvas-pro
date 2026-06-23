/**
 * Safe arithmetic expression evaluator — replaces `new Function()`.
 *
 * Supports only: numbers, +, -, *, /, parentheses.
 * Does NOT execute arbitrary code. Returns NaN on any illegal token.
 */

// Regex that matches a token: number (int or float) | operator | parentheses
const ARITH_TOKEN_RE = /(\d+(?:\.\d+)?|[+\-*/()])/g;

const safeEvalArithmetic = (expr: string): number => {
    const tokens = expr.match(ARITH_TOKEN_RE);
    if (!tokens) {
        return NaN;
    }

    // Shunting-yard algorithm: infix → postfix (RPN), then evaluate.
    const output: (number | string)[] = [];
    const ops: string[] = [];
    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

    for (const tok of tokens) {
        if (/^\d+(?:\.\d+)?$/.test(tok)) {
            output.push(parseFloat(tok));
        } else if (tok === '(') {
            ops.push(tok);
        } else if (tok === ')') {
            while (ops.length && ops[ops.length - 1] !== '(') {
                output.push(ops.pop()!);
            }
            if (!ops.length) return NaN; // mismatched parens
            ops.pop(); // discard '('
        } else {
            // operator: + - * /
            while (ops.length && precedence[ops[ops.length - 1]] >= precedence[tok]) {
                output.push(ops.pop()!);
            }
            ops.push(tok);
        }
    }

    while (ops.length) {
        const op = ops.pop()!;
        if (op === '(') return NaN; // mismatched parens
        output.push(op);
    }

    // Evaluate RPN
    const stack: number[] = [];
    for (const item of output) {
        if (typeof item === 'number') {
            stack.push(item);
        } else {
            const b = stack.pop();
            const a = stack.pop();
            if (a === undefined || b === undefined) return NaN;
            switch (item) {
                case '+':
                    stack.push(a + b);
                    break;
                case '-':
                    stack.push(a - b);
                    break;
                case '*':
                    stack.push(a * b);
                    break;
                case '/':
                    stack.push(b === 0 ? NaN : a / b);
                    break;
                default:
                    return NaN;
            }
        }
    }

    return stack.length === 1 ? stack[0] : NaN;
};

export default safeEvalArithmetic;
