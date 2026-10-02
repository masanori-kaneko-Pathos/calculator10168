import { Component } from '@angular/core'
import { CommonModule } from '@angular/common';

type Operator = '+' | '-' | '×' | '÷';

type CalculatorState =
  | 'INITIAL'
  | 'INPUT_LEFT'       // 最初の数字（左辺）を入力中、または初期状態
  | 'WAITING_RIGHT'    // 演算子を押して、次の数字（右辺）を待っている状態
  | 'INPUT_RIGHT'      // 右辺の数字を入力中
  | 'RESULT_SHOWN'     // 「＝」を押して結果を表示している状態
  | 'SQRT_SHOWN'       // 「√」を押して結果を表示している状態
  | 'PERCENT_SHOWN';   // 「％」を押して結果を表示している状態

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [CommonModule],
})
export class App {

  // =========================================================
  // 基本状態
  // =========================================================

  currentState: CalculatorState = 'INITIAL';

  // 現在ディスプレイに表示している値
  currentValue = '0';

  // オーバーフロー表示
  isOverflow = false;

  // 演算子を押す前に保存しておく左辺
  storedValue: string | null = null;

  // 現在選択されている演算子
  operator: Operator | null = null;

  // =========================================================
  // 連続「=」用
  // =========================================================

  // 前回の計算で使った演算子
  lastOperator: Operator | null = null;

  // 直前に行った途中計算の右辺
  // 例:
  // 3 + 3 → 6
  // その後 - を押した場合
  // previousRightOperand = 3
  previousRightOperand: string | null = null;

  previousByOperator: Record<Operator, string | null>
    = { '+': null, '-': null, '×': null, '÷': null };

  // 連続「=」で繰り返し使用する値
  //
  // 例:
  // 10 + 2 = 12
  // + = 14
  // = 26
  // = 38
  //
  // この場合は最終的に 12 が入る。
  lastOperand: string | null = null;

  // =========================================================
  // % 専用状態
  // =========================================================

  percentChainOperand: string | null = null;

  // %を押す直前の左辺 A
  percentBase: string | null = null;

  // %を押したときの右辺 B
  percentOperand: string | null = null;

  // =========================================================
  // 数字入力
  // =========================================================

  inputDigit(digit: string): void {
    if (this.isOverflow) return;

    // ▼ 新しいステートマシンによる制御
    switch (this.currentState) {

      case 'INITIAL':
        this.currentValue = digit;          // inputDecimal は '0.'
        this.currentState = 'INPUT_LEFT';
        break;

      case 'RESULT_SHOWN':
        this.currentValue = digit;
        this.currentState = 'INPUT_LEFT';
        this.clearPercentState();
        break;

      case 'WAITING_RIGHT':
        this.currentValue = digit;
        this.currentState = 'INPUT_RIGHT';
        this.clearPercentState();
        break;

      case 'SQRT_SHOWN':
        this.currentValue = digit;
        this.currentState = this.operator !== null ? 'INPUT_RIGHT' : 'INPUT_LEFT';
        break;

      case 'PERCENT_SHOWN':
        // %直後の数字入力：画面を置き換えて新しい入力状態へ
        this.currentValue = digit;
        this.currentState = this.operator ? 'INPUT_RIGHT' : 'INPUT_LEFT';
        break;

      case 'INPUT_LEFT':
      case 'INPUT_RIGHT':
        // 0や-0の置き換え（hasTypedInputフラグを使わずにシンプルに判定可能に！）
        if (this.currentValue === '0') {
          this.currentValue = digit;
        } else if (this.currentValue === '-0') {
          this.currentValue = '-' + digit;
        } else {
          // 桁数制限
          const digitCount = this.currentValue.replace('.', '').replace('-', '').length;
          if (digitCount >= 10) return;
          if (this.currentValue.includes('.')) {
            const decimalPart = this.currentValue.split('.')[1];
            if (decimalPart && decimalPart.length >= 8) return;
          }
          this.currentValue += digit;
        }
        break;
    }
  }

  // =========================================================
  // 小数点
  // =========================================================

  inputDecimal(): void {
    if (this.isOverflow) return;

    switch (this.currentState) {
      case 'INITIAL':
        this.currentValue = '0.';          // inputDecimal は '0.'
        this.currentState = 'INPUT_LEFT';
        break;

      case 'RESULT_SHOWN':
        this.currentValue = '0.';
        this.currentState = 'INPUT_LEFT';
        this.clearPercentState();
        break;

      case 'SQRT_SHOWN':
      case 'PERCENT_SHOWN':
        this.currentValue = '0.';
        this.currentState = this.operator !== null ? 'INPUT_RIGHT' : 'INPUT_LEFT';
        break;

      case 'WAITING_RIGHT':
        this.currentValue = '0.';
        this.currentState = 'INPUT_RIGHT';
        this.clearPercentState();
        break;

      case 'INPUT_LEFT':
      case 'INPUT_RIGHT':
        if (this.currentValue.includes('.')) return;
        this.currentValue += '.';
        break;
    }
  }

  // =========================================================
  // 四則演算子
  // =========================================================

  inputOperator(nextOperator: Operator): void {
    if (this.isOverflow) return;

    const currentNumber = this.normalizeNumber(this.currentValue);
    this.currentValue = currentNumber;

    const state: CalculatorState =
      this.currentState === 'SQRT_SHOWN' && this.operator !== null
        ? (this.percentBase !== null && this.percentOperand !== null
          ? 'PERCENT_SHOWN' : 'INPUT_RIGHT')
        : this.currentState;
    switch (state) {

      case 'INITIAL':
      case 'INPUT_LEFT':
        // 最初の演算子入力
        this.storedValue = currentNumber;
        this.setPrevious({ '+': null, '-': null, '×': null, '÷': null }, nextOperator);
        this.operator = nextOperator;
        this.currentState = 'WAITING_RIGHT';
        break;

      case 'WAITING_RIGHT':
        // 演算子の付け替え：最初に押した時に計算しておいた候補から選び直す
        this.storedValue = currentNumber;
        this.operator = nextOperator;
        this.previousRightOperand = this.previousByOperator[nextOperator];
        break;

      case 'INPUT_RIGHT':
        // 既に右辺が入力されていて、連続計算になるケース（12 + 3 × -> 15 ×）
        if (this.storedValue !== null && this.operator !== null) {

          const leftValue = this.storedValue;

          const percentOrigin = this.percentBase !== null && this.percentOperand === null;
          const resultStr = percentOrigin ? currentNumber : this.formatNumber(this.calculateResult(
            leftValue,
            currentNumber,
            this.operator
          ));
          this.percentChainOperand = percentOrigin ? currentNumber : null;

          const addSubPrev = (this.operator === '×' || percentOrigin) ? leftValue : currentNumber;
          this.setPrevious({
            '×': percentOrigin ? currentNumber : resultStr,
            '÷': '1',
            '+': addSubPrev,
            '-': addSubPrev,
          }, nextOperator);

          this.currentValue = percentOrigin ? currentNumber : resultStr;
          this.storedValue = this.currentValue;
          this.operator = nextOperator;
          this.currentState = 'WAITING_RIGHT';
        }
        break;

      case 'RESULT_SHOWN':
      case 'SQRT_SHOWN':
        // = や √ の計算直後に演算子を押した場合
        this.setPrevious({
          '×': currentNumber,
          '÷': '1',
          '+': this.lastOperand,
          '-': this.lastOperand,
        }, nextOperator);
        this.storedValue = currentNumber;
        this.operator = nextOperator;
        this.currentState = 'WAITING_RIGHT';
        this.clearPercentState();
        break;

      case 'PERCENT_SHOWN':
        const percentOrigin = this.percentBase !== null && this.percentOperand === null;

        if (percentOrigin) {
          // ％起点の連鎖（50×%など）は、大元の左辺(50)を暗黙の右辺として退避させる
          const b = this.storedValue;
          this.setPrevious({ '×': b, '÷': b, '+': b, '-': b }, nextOperator);
        } else {
          // 普通の％計算結果（50×20%など）は、通常の計算結果（RESULT_SHOWN）直後と同じ振る舞いにする
          this.setPrevious({
            '×': currentNumber,
            '÷': '1',
            '+': this.storedValue,
            '-': this.storedValue,
          }, nextOperator);
        }

        this.storedValue = currentNumber;
        this.operator = nextOperator;
        this.currentState = 'WAITING_RIGHT';
        this.clearPercentState();
        break;
    }
  }


  private setPrevious(map: Record<Operator, string | null>, next: Operator): void {
    this.previousByOperator = map;
    this.previousRightOperand = map[next];
  }



  // =========================================================
  // %
  // =========================================================
  inputPercent(): void {
    if (this.isOverflow) return;

    const currentNumber = this.currentValue;
    let finalResult = '0';

    const state: CalculatorState =
      this.currentState === 'SQRT_SHOWN' && this.operator !== null
        ? 'INPUT_RIGHT'
        : this.currentState;
    switch (state) {
      // -------------------------------------------------------
      // = の直後（定数を使った特殊な％計算）
      // -------------------------------------------------------
      case 'RESULT_SHOWN':
        if (
          this.lastOperator === null ||
          this.lastOperator === '+' ||
          this.lastOperator === '-') {
          return;
        }
        if (this.lastOperator === '×' && this.lastOperand !== null) {

          const curPct = this.calculateResult(
            this.currentValue,
            '100',
            '÷'
          );

          finalResult = this.calculateResult(
            this.lastOperand,
            curPct,
            '×'
          );
        } else if (this.lastOperator === '÷' && this.lastOperand !== null) {
          const divisorPct = this.calculateResult(
            this.lastOperand,
            '100',
            '÷'
          );
          finalResult = this.calculateResult(
            this.currentValue,
            divisorPct,
            '÷'
          );
        }
        this.currentValue = this.formatNumber(finalResult);
        this.currentState = 'RESULT_SHOWN';
        break;

      // -------------------------------------------------------
      // 演算子なし（一番最初の入力時など）
      // -------------------------------------------------------
      case 'INITIAL':
      case 'INPUT_LEFT':
        if (this.operator === null || this.storedValue === null) {
          if (this.currentValue !== '0' && this.currentValue !== '-0') {
            this.currentValue = '0';
          }
          if (this.currentState !== 'INITIAL')
            this.currentState = 'PERCENT_SHOWN';
          this.resetRepeatState();
        }
        break;

      case 'SQRT_SHOWN':
        if (this.operator === null || this.storedValue === null) {
          this.currentValue = '0';
          this.currentState = 'PERCENT_SHOWN';
          this.resetRepeatState();
        }
        break;

      // -------------------------------------------------------
      // ％の連続押し、または％連鎖中の特殊除算
      // -------------------------------------------------------
      case 'PERCENT_SHOWN': {
        if (this.operator === null || this.storedValue === null) return;
        if (this.operator === '+' || this.operator === '-') return;
        if (this.operator === '÷' && this.percentBase !== null && this.percentOperand === null) {
          const divisor = this.percentChainOperand ?? this.percentBase;
          const pct = this.calculateResult('100', divisor, '÷');
          finalResult = this.calculateResult(this.currentValue, pct, '×');
        } else {
          finalResult = this.percentWithRightOperand(this.storedValue, currentNumber);
        }
        this.currentValue = this.formatNumber(finalResult);
        this.currentState = 'PERCENT_SHOWN';
        break;
      }

      case 'WAITING_RIGHT': {
        const base = this.storedValue!;
        if (this.operator === '+' || this.operator === '-') {
          this.currentValue = base;      // 50 + % → 50 のまま。％状態には入らない
          return;
        }
        if (this.operator === '÷' && this.percentBase !== null &&
          this.percentOperand === null && this.percentChainOperand !== null) {
          finalResult = this.calculateResult('100', this.percentChainOperand, '÷');
        } else {
          this.percentBase = base;
          this.percentOperand = null;
          if (this.operator === '×') {
            const pct = this.calculateResult(base, '100', '÷');
            finalResult = this.calculateResult(base, pct, '×');
          } else if (this.operator === '÷') {
            finalResult = this.calculateResult('100', base, '÷');
          }
        }
        this.currentValue = this.formatNumber(finalResult);
        this.currentState = 'PERCENT_SHOWN';
        break;
      }

      case 'INPUT_RIGHT': {
        const base = this.storedValue!;
        if (this.operator === '÷' && this.percentBase !== null && this.percentOperand === null) {
          const divisor = this.percentChainOperand ?? this.percentBase;
          const pct = this.calculateResult('100', divisor, '÷');
          finalResult = this.calculateResult(currentNumber, pct, '×');
        } else {
          finalResult = this.percentWithRightOperand(base, currentNumber);
        }
        this.currentValue = this.formatNumber(finalResult);
        this.currentState = 'PERCENT_SHOWN';
        break;
      }
    }
  }

  // 新規メソッド（inputPercent の下）: 旧 INPUT_RIGHT の「右辺がある場合」を共通化
  private percentWithRightOperand(base: string, currentNumber: string): string {
    this.percentBase = base;
    if (this.operator === '÷' && this.percentOperand !== null) {
      const pct = this.calculateResult(this.percentOperand, '100', '÷');
      return this.calculateResult(currentNumber, pct, '÷');
    }
    this.percentOperand = currentNumber;
    const curPct = this.calculateResult(currentNumber, '100', '÷');
    if (this.operator === '+' || this.operator === '-') {
      const delta = this.calculateResult(base, curPct, '×');
      return this.calculateResult(base, delta, this.operator);
    } else if (this.operator === '×') {
      return this.calculateResult(base, curPct, '×');
    } else if (this.operator === '÷') {
      return this.calculateResult(base, curPct, '÷');
    }
    return '0';
  }


  // =========================================================
  // √
  // =========================================================

  inputSquareRoot(): void {
    if (this.isOverflow) return;

    const valueStr = this.currentValue;

    // 負数の平方根
    if (valueStr.startsWith('-') && !/^-0\.?0*$/.test(valueStr)) {
      this.currentValue = '0';
      this.isOverflow = true;
      this.currentState = 'SQRT_SHOWN';
      this.operator = null;
      this.resetRepeatState();
      return;
    }

    if (valueStr === '0' || /^-0\.?0*$/.test(valueStr)) {
      this.currentValue = '0';

      this.currentState = 'SQRT_SHOWN';
      return;
    }

    const [intPart, fracPart = ''] = valueStr.split('.');
    const paddedFrac = fracPart.padEnd(32, '0').slice(0, 32);
    const bigVal = BigInt(intPart + paddedFrac);
    const resultBigInt = this.bigIntSqrt(bigVal);
    const resultStr = this.fromScaledBigInt(resultBigInt);

    this.currentValue = this.formatNumber(resultStr);
    this.currentState = 'SQRT_SHOWN';

  }



  // =========================================================
  // =
  // =========================================================

  calculate(): void {
    if (this.isOverflow) return;

    if (this.currentState !== 'WAITING_RIGHT') {
      this.currentValue = this.normalizeNumber(this.currentValue);
    }

    // 演算子も過去の計算履歴もない状態での「=」は、そのまま結果表示状態へ移行
    if (this.operator === null && this.lastOperator === null) {
      this.currentState = 'RESULT_SHOWN';
      return;
    }

    const state: CalculatorState =
      this.currentState === 'SQRT_SHOWN' && this.operator !== null
        ? (this.percentBase !== null ? 'PERCENT_SHOWN' : 'INPUT_RIGHT')
        : this.currentState;
    switch (state) {

      // ---------------------------------------------------------
      // 連続 =
      // ---------------------------------------------------------
      case 'INITIAL':
      case 'INPUT_LEFT':
      case 'RESULT_SHOWN':
      case 'SQRT_SHOWN':
        if (this.operator === null && this.lastOperator !== null && this.lastOperand !== null) {
          const result = this.calculateResult(this.currentValue, this.lastOperand, this.lastOperator);
          this.currentValue = this.formatNumber(result);

          // 状態を更新
          this.currentState = 'RESULT_SHOWN';
        }
        break;

      // ---------------------------------------------------------
      // %特殊処理（％のあとの＝）
      // ---------------------------------------------------------
      case 'PERCENT_SHOWN':

        if (this.operator === null) {
          if (this.lastOperator !== null && this.lastOperand !== null) {
            const result = this.calculateResult(this.currentValue, this.lastOperand, this.lastOperator);
            this.currentValue = this.formatNumber(result);
            this.currentState = 'RESULT_SHOWN';
          }
          break;
        }
        if (this.percentBase !== null && this.operator !== null) {
          const percentResult = this.currentValue;
          const base = this.percentBase;
          const currentOperator = this.operator;

          if (currentOperator === '+' || currentOperator === '-') {
            const result = this.calculateResult(percentResult, base, currentOperator);
            this.currentValue = this.formatNumber(result);
            this.lastOperator = currentOperator;
            this.lastOperand = base;
          } else if (currentOperator === '×') {
            const result = this.calculateResult(percentResult, base, currentOperator);
            this.currentValue = this.formatNumber(result);
            this.lastOperator = '×';
            this.lastOperand = base;
          } else if (currentOperator === '÷') {
            const divisor = this.percentOperand !== null ? this.percentOperand
              : this.percentChainOperand !== null ? this.percentChainOperand
                : this.percentBase;
            if (divisor !== null) {
              const result = this.calculateResult(percentResult, divisor, currentOperator);
              this.currentValue = this.formatNumber(result);
              this.lastOperator = '÷';
              this.lastOperand = divisor;
            }
          }

          // 計算が終わったので各種リセットして結果表示状態へ
          this.storedValue = null;
          this.operator = null;
          this.currentState = 'RESULT_SHOWN';
          this.clearPercentState();
        }
        break;

      // ---------------------------------------------------------
      // 演算子入力直後に「=」を押した場合
      // ---------------------------------------------------------
      case 'WAITING_RIGHT':
        if (this.previousRightOperand !== null && this.storedValue !== null && this.operator !== null) {
          const result = this.calculateResult(this.previousRightOperand, this.storedValue, this.operator);
          this.currentValue = this.formatNumber(result);
          this.lastOperator = this.operator;
          this.lastOperand = this.storedValue;
        } else if (this.storedValue !== null && this.operator !== null) {
          const rightValue = this.storedValue;
          let implicitLeftValue = '0';
          if (this.operator === '×') implicitLeftValue = rightValue;
          else if (this.operator === '÷') implicitLeftValue = '1';

          const result = this.calculateResult(implicitLeftValue, rightValue, this.operator);
          this.currentValue = this.formatNumber(result);
          this.lastOperator = this.operator;
          this.lastOperand = rightValue;
        }

        this.storedValue = null;
        this.operator = null;
        this.currentState = 'RESULT_SHOWN';
        this.clearPercentState();
        break;

      // ---------------------------------------------------------
      // 通常の = 
      // ---------------------------------------------------------
      case 'INPUT_RIGHT':
        if (this.operator !== null && this.storedValue !== null) {
          const leftValue = this.storedValue;
          const rightValue = this.currentValue;
          const result = this.calculateResult(leftValue, this.currentValue, this.operator);
          this.currentValue = this.formatNumber(result);

          this.lastOperator = this.operator;
          this.lastOperand = this.operator === '×' ? leftValue : rightValue;

          this.storedValue = null;
          this.operator = null;
          this.currentState = 'RESULT_SHOWN';
          this.clearPercentState();
        }
        break;
    }
  }
  // =========================================================
  // 四則演算 （ BigIntを導入 ）
  // =========================================================
  private calculateResult(
    leftStr: string,
    rightStr: string,
    operator: Operator):
    string {
    if (leftStr === 'NaN' || rightStr === 'NaN') return 'NaN';
    const left = this.toScaledBigInt(leftStr);
    const right = this.toScaledBigInt(rightStr);
    let result: bigint;

    const SCALE = 10000000000000000n;

    switch (operator) {

      case '+':
        result = left + right;
        break;

      case '-':
        result = left - right;
        break;

      case '×':
        result = (left * right) / SCALE;
        break;

      case '÷':

        if (right === 0n)
          return 'NaN';


        result = (left * SCALE) / right;
        break;

      default:
        throw new Error(
          `Unknown operator: ${operator}`
        );
    }
    return this.fromScaledBigInt(result);
  }

  // 文字列を 10^16 倍した BigInt に変換
  private toScaledBigInt(str: string): bigint {
    if (!str || str === 'NaN') return 0n;
    const isNegative = str.startsWith('-');
    const absStr = isNegative ? str.slice(1) : str;
    const [intPart, fracPart = ''] = absStr.split('.');

    // 小数部を16桁になるようにゼロ埋めして結合
    const paddedFrac = fracPart.padEnd(16, '0').slice(0, 16);
    const val = BigInt(intPart + paddedFrac);

    return isNegative ? -val : val;
  }

  // 計算後の BigInt を小数点を正しい位置に戻して文字列化
  private fromScaledBigInt(val: bigint): string {
    const isNegative = val < 0n;
    const absVal = isNegative ? -val : val;
    let str = absVal.toString().padStart(17, '0');

    const intPart = str.slice(0, -16) || '0';
    const fracPart = str.slice(-16).replace(/0+$/, '');

    const res = fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
    return isNegative && res !== '0' ? `-${res}` : res;
  }

  // 整数平方根
  private bigIntSqrt(n: bigint): bigint {
    if (n < 0n) return 0n;
    if (n === 0n) return 0n;

    let x = n;
    let y = (x + 1n) / 2n;

    while (y < x) {
      x = y;
      y = (x + n / x) / 2n;
    }
    return x;
  }

  // =========================================================
  // ±
  // =========================================================
  toggleSign(): void {
    if (this.isOverflow) return;

    // 演算子直後の ± (左辺の符号を反転する特殊処理)
    if (this.currentState === 'WAITING_RIGHT') {
      if (this.storedValue !== null) {
        const oldStored = this.storedValue;
        const wasSame = this.operator === '×' && this.previousRightOperand === this.storedValue;
        this.storedValue = this.storedValue.startsWith('-')
          ? this.storedValue.slice(1)
          : '-' + this.storedValue;

        if (wasSame) this.previousRightOperand = this.storedValue;
        if (this.previousByOperator['×'] === oldStored) this.previousByOperator['×'] = this.storedValue;
        this.currentValue = this.storedValue;
      }
      return;
    }
    // 通常の符号反転
    this.currentValue = this.currentValue.startsWith('-')
      ? this.currentValue.slice(1)
      : '-' + this.currentValue;
  }

  // =========================================================
  // C
  // =========================================================
  clear(): void {
    if (this.isOverflow) return;

    switch (this.currentState) {
      case 'INITIAL':
      case 'RESULT_SHOWN':
      case 'WAITING_RIGHT':
      case 'PERCENT_SHOWN':
        // これらの状態の時は C ボタンを押しても消さない（ACのみ有効）
        return;

      case 'INPUT_LEFT':
      case 'INPUT_RIGHT':
      case 'SQRT_SHOWN':
        // 現在表示している数字だけをクリア
        this.currentValue = '0';

        // 演算子が存在していれば右辺入力待ちへ、なければ初期状態へ
        this.currentState = this.operator !== null ? 'INPUT_RIGHT' : 'INPUT_LEFT';
        break;
    }
  }


  // =========================================================
  // AC
  // =========================================================

  clearAll(): void {

    this.currentValue = '0';
    this.storedValue = null;
    this.operator = null;

    this.isOverflow = false;
    this.currentState = 'INITIAL';
    this.resetRepeatState();
  }


  // 入力確定時の整形: 5.0 → 5、-5. → -5、-0 → 0、0.50 → 0.5（整数の 0 は消さない）
  private normalizeNumber(value: string): string {
    let result = value;
    if (result.includes('.')) {
      result = result.replace(/0+$/, '').replace(/\.$/, '');
    }
    return result === '-0' ? '0' : result;
  }
  // =========================================================
  // %状態解除
  // =========================================================

  private clearPercentState(): void {

    this.percentChainOperand = null;
    this.percentBase = null;
    this.percentOperand = null;
  }


  // =========================================================
  // 連続計算状態を完全リセット
  // =========================================================

  private resetRepeatState(): void {

    this.lastOperator = null;
    this.lastOperand = null;
    this.previousRightOperand = null;
    this.previousByOperator = { '+': null, '-': null, '×': null, '÷': null };
    this.clearPercentState();
  }

  // =========================================================
  // 表示用数値整形
  // =========================================================

  private formatNumber(valueStr: string): string {
    if (valueStr === 'NaN' ||
      valueStr === 'Infinity' ||
      valueStr === '-Infinity') {
      this.isOverflow = true;
      return '0';
    }

    const isNegative = valueStr.startsWith('-');
    const absValue = isNegative ? valueStr.slice(1) : valueStr;
    const [intPart, fracPart = ''] = absValue.split('.');

    if (intPart.length > 10) {
      return this.formatOverflow(valueStr);
    }

    this.isOverflow = false;

    let decimalDigits = 0;
    if (intPart === '0') {
      decimalDigits = 8;
    } else {
      decimalDigits = Math.min(8, Math.max(0, 10 - intPart.length));
    }

    // 文字列のまま切り捨て（丸め込みによる繰り上げを絶対に起こさせない）
    const truncatedFrac = fracPart.slice(0, decimalDigits).replace(/0+$/, '');
    const result = truncatedFrac.length > 0 ? `${intPart}.${truncatedFrac}` : intPart;

    return isNegative && result !== '0' ? `-${result}` : result;
  }




  // =========================================================
  // オーバーフロー表示
  //
  // 10000000000
  // ↓
  // E1.00000000
  //
  // 25000000000
  // ↓
  // E2.50000000
  // =========================================================

  private formatOverflow(valueStr: string): string {
    this.isOverflow = true;

    const isNegative = valueStr.startsWith('-');
    const absValue = isNegative ? valueStr.slice(1) : valueStr;
    const [intPart, fracPart = ''] = absValue.split('.');

    const mantissaInt = intPart.slice(0, intPart.length - 10);
    const rest = intPart.slice(intPart.length - 10) + fracPart;

    const decimalDigits = Math.min(8, Math.max(0, 10 - mantissaInt.length));
    const truncatedFrac = rest.slice(0, decimalDigits);

    // 表示は常に小数部を桁数ぶん0埋めする（E1.00000000）
    const mantissaText =
      decimalDigits === 0
        ? `${mantissaInt}.`
        : `${mantissaInt}.${truncatedFrac.padEnd(decimalDigits, '0')}`;


    return isNegative
      ? `-${mantissaText}`
      : mantissaText;
  }
  // =========================================================
  // ディスプレイの記号
  // =========================================================


  get displayPrefix(): string {
    return this.currentValue.startsWith('-') ? '－' : '';
  }

  get displayExponent(): string {
    return this.isOverflow ? 'E' : '';
  }

  get displayNumber(): string {
    return this.currentValue.replace(/^-/, '');
  }

  get displayOperator(): string {
    if (this.currentState === 'PERCENT_SHOWN') {
      return '';
    }
    return this.operator ?? '';
  }


}