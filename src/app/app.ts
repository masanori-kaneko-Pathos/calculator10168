import { Component } from '@angular/core'
import { CommonModule } from '@angular/common';

type Operator = '+' | '-' | '×' | '÷';

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

  // 現在ディスプレイに表示している値
  currentValue = '0';

  // 演算子を押す前に保存しておく左辺
  storedValue: number | null = null;

  // 現在選択されている演算子
  operator: Operator | null = null;

  // 演算子を押した直後か
  waitingForOperand = false;

  // 計算結果を表示した直後か
  justCalculated = false;



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
  previousRightOperand: number | null = null;

  // 連続「=」で繰り返し使用する値
  //
  // 例:
  // 10 + 2 = 12
  // + = 14
  // = 26
  // = 38
  //
  // この場合は最終的に 12 が入る。
  lastOperand: number | null = null;


  // =========================================================
  // % 専用状態
  // =========================================================

  // 「%」を押した状態か
  percentMode = false;

  // %を押す直前の左辺 A
  percentBase: number | null = null;

  // %を押したときの右辺 B
  percentOperand: number | null = null;

  // =========================================================
  // × の連続 = 特殊処理用フラグ
  // =========================================================
  leftSignChanged: boolean = false;
  multiplySignChanged: boolean = false;


  // =========================================================
  // 数字入力
  // =========================================================

  inputDigit(digit: string): void {

    if (this.isOverflow) {
      return;
    }


    // ---------------------------------------------------------
    // √や=などの計算直後
    // ---------------------------------------------------------

    if (this.justCalculated) {

      this.currentValue = digit;

      this.justCalculated = false;
      this.waitingForOperand = false;

      this.resetRepeatState();
      this.isOverflow = false;

      return;
    }


    // ---------------------------------------------------------
    // 演算子直後
    // ---------------------------------------------------------

    if (this.waitingForOperand) {

      this.currentValue = digit;

      this.waitingForOperand = false;

      this.clearPercentState();
      this.isOverflow = false;

      return;
    }


    // ---------------------------------------------------------
    // %の直後に数字を入力した場合
    //
    // %で表示された値をそのまま編集するのではなく、
    // 新しい数字入力として扱う。
    // ---------------------------------------------------------

    if (this.percentMode) {

      this.currentValue = digit;

      this.clearPercentState();
      this.isOverflow = false;

      return;
    }


    // ---------------------------------------------------------
    // 0なら置き換え
    // ---------------------------------------------------------

    if (this.currentValue === '0') {

      this.currentValue = digit;
      this.isOverflow = false;

      return;
    }

    // ---------------------------------------------------------
    // 現在の数字の「数字部分」だけ数える
    // ---------------------------------------------------------

    const digitCount =
      this.currentValue
        .replace('.', '')
        .replace('-', '')
        .length;


    // ---------------------------------------------------------
    // 10桁に達していたら入力を無視
    // ---------------------------------------------------------

    if (digitCount >= 10) {
      return;
    }


    // ---------------------------------------------------------
    // それ以外は末尾に追加
    // ---------------------------------------------------------

    this.currentValue += digit;
  }


  // =========================================================
  // 小数点
  // =========================================================

  inputDecimal(): void {

    if (this.isOverflow) {
      return;
    }


    // 計算直後
    if (this.justCalculated) {

      this.currentValue = '0.';

      this.justCalculated = false;
      this.waitingForOperand = false;

      this.resetRepeatState();

      return;
    }


    // 演算子直後
    if (this.waitingForOperand) {

      this.currentValue = '0.';

      this.waitingForOperand = false;

      this.clearPercentState();

      return;
    }


    // %直後
    if (this.percentMode) {

      this.currentValue = '0.';

      this.clearPercentState();

      return;
    }


    // すでに小数点があれば何もしない
    if (this.currentValue.includes('.')) {
      return;
    }

    this.currentValue += '.';
  }


  // =========================================================
  // 四則演算子
  // =========================================================

  inputOperator(nextOperator: Operator): void {

    if (this.isOverflow) {
      return;
    }

    const currentNumber = Number(this.currentValue);


    // ---------------------------------------------------------
    // 計算直後に演算子を押した場合
    // ---------------------------------------------------------

    if (this.justCalculated) {
      if (nextOperator === '×') {

        // C × ?
        // 「=」で C を右辺に入れる
        this.previousRightOperand = currentNumber;

      } else if (nextOperator === '÷') {

        // C ÷ ?
        // 「=」で 1 を右辺に入れる
        this.previousRightOperand = 1;

      } else {

        // + / -
        // 従来どおり、元の右辺を使う
        this.previousRightOperand = this.lastOperand;
      }

      this.storedValue = currentNumber;
      this.operator = nextOperator;

      this.waitingForOperand = true;
      this.justCalculated = false;

      this.clearPercentState();

      return;
    }


    // ---------------------------------------------------------
    // %直後に演算子を押した場合
    //
    // %で作られた表示値を次の計算の左辺として使う。
    // ---------------------------------------------------------

    if (this.percentMode) {
      // %で表示されている値を、そのまま新しい左辺にする
      this.storedValue = currentNumber;
      this.operator = nextOperator;
      this.waitingForOperand = true;
      this.justCalculated = false;

      this.clearPercentState();
      return;
    }


    // ---------------------------------------------------------
    // すでに演算子があり、右辺も入力済み
    //
    // 12 + 3 ×
    // ↓
    // 15 ×
    // ---------------------------------------------------------

    if (
      this.operator !== null &&
      this.storedValue !== null &&
      !this.waitingForOperand
    ) {
      const result = this.calculateResult(
        this.storedValue,
        currentNumber,
        this.operator
      );
      // 直前の計算で使った右辺を保存
      this.previousRightOperand = currentNumber;

      // 計算結果を次の左辺にする
      this.storedValue = result;

      this.currentValue = this.formatNumber(result);
    } else {

      // 最初の演算子
      this.storedValue = currentNumber;
    }


    this.operator = nextOperator;
    this.waitingForOperand = true;
    this.justCalculated = false;
  }

  // =========================================================
  // %
  // =========================================================
  inputPercent(): void {

    if (this.isOverflow) {
      return;
    }

    const currentNumber = Number(this.currentValue);

    // =======================================================
    // + / - で % を一度計算した後の % は無視
    //
    // 50 + 20 %
    // → 60
    //
    // もう一度 %
    // → 何もしない
    // =======================================================
    if (
      this.percentMode &&
      (this.operator === '+' || this.operator === '-')
    ) {
      return;
    }

    // =======================================================
    // 演算子なし
    //
    // 50 %
    // → 0
    // =======================================================
    if (
      this.operator === null ||
      this.storedValue === null
    ) {

      this.currentValue = '0';
      this.justCalculated = true;
      this.waitingForOperand = false;
      this.resetRepeatState();

      return;
    }

    const base = this.storedValue;

    // =======================================================
    // すでに % を押している場合
    // =======================================================

    if (
      this.percentMode &&
      this.operator === '÷' &&
      this.percentBase !== null &&
      this.percentOperand === null
    ) {

      const divisor =
        this.percentBase;

      // 0% は除数 0 になるため計算しない
      if (divisor === 0) {
        return;
      }

      const result =
        Number(this.currentValue) * (100 / divisor);

      this.currentValue =
        this.formatNumber(result);

      this.waitingForOperand = false;
      this.justCalculated = false;

      return;
    }

    // =======================================================
    // =======================================================
    // 右辺が存在する場合
    //
    // 例:
    //
    // 50 + 20 %
    // 50 - 20 %
    // 50 × 20 %
    // 50 ÷ 20 %
    // =======================================================
    // =======================================================

    if (!this.waitingForOperand) {

      // %を押した時点の右辺
      this.percentOperand = currentNumber;

      // %を押した時点の左辺
      this.percentBase = base;

      // -------------------------------------------------------
      // +
      //
      // 50 + 20 %
      // → 60
      // -------------------------------------------------------
      if (this.operator === '+') {

        const result =
          base + (base * currentNumber / 100);

        this.currentValue =
          this.formatNumber(result);
      }

      // -------------------------------------------------------
      // -
      //
      // 50 - 20 %
      // → 40
      // -------------------------------------------------------
      else if (this.operator === '-') {

        const result =
          base - (base * currentNumber / 100);

        this.currentValue =
          this.formatNumber(result);
      }

      // -------------------------------------------------------
      // ×
      //
      // 50 × 20 %
      // → 10
      // -------------------------------------------------------
      else if (this.operator === '×') {

        const result =
          base * (currentNumber / 100);

        this.currentValue =
          this.formatNumber(result);
      }

      // -------------------------------------------------------
      // ÷
      //
      // 50 ÷ 20 %
      //
      // 20% = 0.2
      //
      // 50 ÷ 0.2
      // = 250
      // -------------------------------------------------------
      else if (this.operator === '÷') {

        const divisor =
          currentNumber / 100;

        // 0% は除数0なので計算しない
        if (divisor === 0) {
          return;
        }

        const result =
          base / divisor;

        this.currentValue =
          this.formatNumber(result);
      }

      // %を押した状態として記録
      this.percentMode = true;

      this.waitingForOperand = false;
      this.justCalculated = false;

      return;
    }

    // =======================================================
    // =======================================================
    // 右辺が存在しない場合
    //
    // 例:
    //
    // 50 + %
    // 50 - %
    // 50 × %
    // 50 ÷ %
    // =======================================================
    // =======================================================

    this.percentOperand = null;
    this.percentBase = base;
    this.percentMode = true;

    // -------------------------------------------------------
    // +
    //
    // 50 + %
    // → 50
    // -------------------------------------------------------
    if (this.operator === '+') {

      this.currentValue =
        this.formatNumber(base);
    }

    // -------------------------------------------------------
    // -
    //
    // 50 - %
    // → 50
    // -------------------------------------------------------
    else if (this.operator === '-') {

      this.currentValue =
        this.formatNumber(base);
    }

    // -------------------------------------------------------
    // ×
    //
    // 50 × %
    // → 25
    // -------------------------------------------------------
    else if (this.operator === '×') {

      const result =
        base * (base / 100);

      this.currentValue =
        this.formatNumber(result);
    }

    // -------------------------------------------------------
    // ÷
    //
    // 50 ÷ %
    // → 2
    //
    // 今回の仕様では
    //
    // 100 ÷ 50
    // = 2
    //
    // とする。
    // -------------------------------------------------------
    else if (this.operator === '÷') {

      if (base === 0) {
        return;
      }

      const result =
        100 / base;

      this.currentValue =
        this.formatNumber(result);
    }

    this.waitingForOperand = false;
    this.justCalculated = false;
  }



  // =========================================================
  // √
  // =========================================================

  inputSquareRoot(): void {
    if (this.isOverflow) {
      return;
    }

    // 現在の値を取得
    const value = Number(this.currentValue);

    // 負数の平方根
    if (value < 0) {
      this.currentValue = '0';
      this.isOverflow = true;
      this.operator = null;
      this.waitingForOperand = false;
      this.justCalculated = true;
      this.resetRepeatState();
      return;
    }

    // 平方根を計算
    const result = Math.sqrt(value);

    // 表示用に整形
    const formatted = this.formatNumber(result);

    // ---------------------------------------------------------
    // √を繰り返したときの「1.00000001問題」対策
    // ---------------------------------------------------------
    //
    // 1より少し大きい値になってしまった場合、
    // 電卓としては1に収束したとみなす。
    //
    // 例:
    // 1.00000001
    // ↓ √
    // 1.000000005
    //
    // 以降 √ を押しても 1 のまま
    //
    if (
      formatted === this.currentValue &&
      Math.abs(value - 1) < 0.000000001
    ) {
      this.currentValue = '1';
    } else {
      this.currentValue = formatted;
    }

    this.waitingForOperand = false;
    this.justCalculated = true;
    this.clearPercentState();
  }


  // =========================================================
  // =
  // =========================================================

  calculate(): void {

    if (this.isOverflow) {
      return;
    }


    // =========================================================
    // 連続 =
    // =========================================================

    if (
      this.justCalculated &&
      this.lastOperator !== null &&
      this.lastOperand !== null
    ) {

      const currentNumber = Number(this.currentValue);

      const result = this.calculateResult(
        currentNumber,
        this.lastOperand,
        this.lastOperator
      );

      this.currentValue = this.formatNumber(result);

      this.justCalculated = true;

      return;
    }




    // =========================================================
    // %特殊処理
    // =========================================================
    if (
      this.percentMode &&
      this.percentBase !== null
    ) {

      const percentResult = Number(this.currentValue);
      const base = this.percentBase;
      const currentOperator = this.operator;

      // -------------------------------------------------------
      // + / -
      //
      // %を押した時点で表示値はすでに計算済み。
      //
      // 50 + 20 %
      // → 60
      // =
      // → 60 + 50 = 110
      //
      // 50 - 20 %
      // → 40
      // =
      // → 40 - 50 = -10
      //
      // 「現在の表示値」を左辺、
      // 「元の左辺」を右辺として使用する。
      // -------------------------------------------------------
      if (
        currentOperator === '+' ||
        currentOperator === '-'
      ) {

        const result = this.calculateResult(
          percentResult,
          base,
          currentOperator
        );

        this.currentValue =
          this.formatNumber(result);

        this.lastOperator = currentOperator;

        // 次の連続 = では元の左辺を繰り返す
        this.lastOperand = base;

        this.storedValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.justCalculated = true;

        this.clearPercentState();

        return;
      }

      // -------------------------------------------------------
      // ×
      //
      // 50 × 20 %
      // → 10
      // =
      // → 10 × 50 = 500
      // =
      // → 500 × 50 = 25000
      //
      // ここは今まで通り。
      // -------------------------------------------------------
      if (currentOperator === '×') {

        const result = this.calculateResult(
          percentResult,
          base,
          currentOperator
        );

        this.currentValue =
          this.formatNumber(result);

        this.lastOperator = '×';
        this.lastOperand = base;

        this.storedValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.justCalculated = true;

        this.clearPercentState();

        return;
      }

      // -------------------------------------------------------
      // ÷
      // -------------------------------------------------------
      if (currentOperator === '÷') {

        const divisor =
          this.percentOperand !== null
            ? this.percentOperand
            : this.percentBase;

        if (divisor === null || divisor === 0) {
          return;
        }

        const result = this.calculateResult(
          percentResult,
          divisor,
          currentOperator
        );

        this.currentValue =
          this.formatNumber(result);

        this.lastOperator = '÷';
        this.lastOperand = divisor;

        this.storedValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.justCalculated = true;

        this.clearPercentState();

        return;
      }
    }


    // =========================================================
    // 「1 + =」や「3 + 3 - =」など
    // 演算子入力直後に「=」を押した場合
    // =========================================================
    if (this.waitingForOperand) {

      // -------------------------------------------------------
      // 直前までに計算結果が存在する場合
      //
      // 例:
      //
      // 3 + 3 = 6
      // - =
      //
      // この時点では
      // lastOperand = 3
      // storedValue = 6
      // operator = -
      //
      // 実機では
      // 3 - 6 = -3
      //
      // 次の = では
      // -3 - 6 = -9
      // -------------------------------------------------------
      if (
        this.previousRightOperand !== null &&
        this.storedValue !== null &&
        this.operator !== null
      ) {

        const previousRightValue = this.previousRightOperand;
        const previousResult = this.storedValue;
        const currentOperator = this.operator;
        const result = this.calculateResult(
          previousRightValue,
          previousResult,
          currentOperator
        );

        this.currentValue =
          this.formatNumber(result);

        // -----------------------------------------------------
        // 次の連続「=」では、
        // 直前の計算結果を繰り返し使用する
        //
        // 3 + 3 - =
        // → 3 - 6 = -3
        //
        // 次:
        // → -3 - 6 = -9
        // → -9 - 6 = -15
        //
        // 5 - 2 - =
        // → 2 - 3 = -1
        //
        // 次:
        // → -1 - 3 = -4
        // → -4 - 3 = -7
        // -----------------------------------------------------
        this.lastOperator = currentOperator;
        this.lastOperand = previousResult;

        this.storedValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.justCalculated = true;

        this.clearPercentState();

        return;
      }

      // -------------------------------------------------------
      // まだ計算が存在しない場合
      //
      // 1 + =
      // → 0 + 1 = 1
      //
      // 1 - =
      // → 0 - 1 = -1
      //
      // その後の「=」では
      //
      // 1 + 1 = 2
      // -1 - 1 = -2
      //
      // と連続する
      // -------------------------------------------------------
      if (
        this.storedValue !== null &&
        this.operator !== null
      ) {
        const rightValue = this.storedValue;
        const currentOperator = this.operator;
        const result = this.calculateResult(
          0,
          rightValue,
          currentOperator
        );

        this.currentValue =
          this.formatNumber(result);
        this.lastOperator = currentOperator;
        this.lastOperand = rightValue;

        this.storedValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.justCalculated = true;

        this.clearPercentState();

        return;
      }
    }
    // =========================================================
    // 演算子がない演算子がない、または通常の = （1 + 3 = など）
    // =========================================================

    if (
      this.operator === null ||
      this.storedValue === null
    ) {
      return;
    }

    const currentNumber = Number(this.currentValue);
    const currentOperator = this.operator;
    const leftValue = this.storedValue;

    const result = this.calculateResult(
      this.storedValue,
      currentNumber,
      currentOperator,
    );

    this.currentValue = this.formatNumber(result);
    this.lastOperator = currentOperator;

    // =========================================================
    // 連続 = 用に保存
    // =========================================================
    if (
      currentOperator === '×') {
      // 掛け算は「左辺」を繰り返す
      this.lastOperand = leftValue;
    } else {
      // + - ÷ は通常通り「右辺」を繰り返す
      this.lastOperand = currentNumber;
    }

    this.storedValue = null;
    this.operator = null;
    this.waitingForOperand = false;
    this.justCalculated = true;

    // 次の新しい計算のためにフラグをリセット
    this.leftSignChanged = false;
    this.multiplySignChanged = false;

    this.clearPercentState();
  }



  // =========================================================
  // 四則演算
  // =========================================================
  private calculateResult(
    left: number,
    right: number,
    operator: Operator
  ): number {

    switch (operator) {

      case '+':
        return left + right;

      case '-':
        return left - right;

      case '×':
        return left * right;

      case '÷':

        if (right === 0) {
          return NaN;
        }

        return left / right;

      default:
        throw new Error(
          `Unknown operator: ${operator}`
        );
    }
  }


  // =========================================================
  // ±
  // =========================================================
  toggleSign(): void {

    if (this.isOverflow) {
      return;
    }

    const value = Number(this.currentValue);

    // =========================================================
    // 演算子直後の ±
    // → 演算子の左側にある数字を反転する
    // → + - × ÷ 共通
    // =========================================================
    if (this.waitingForOperand && this.operator !== null) {

      if (this.storedValue !== null && this.storedValue !== 0) {
        this.storedValue = -this.storedValue;

        // 表示も変更後の左辺にする
        this.currentValue =
          this.formatNumber(this.storedValue);

      }

      return;

    }

    // 0は -0 にしない
    if (value === 0) {
      return;
    }

    this.currentValue =
      this.formatNumber(-value);
  }

  // =========================================================
  // C
  // =========================================================

  clear(): void {

    // 計算結果表示中は C では消さない
    // AC なら clearAll() で完全に消せる
    if (this.justCalculated) {
      return;
    }

    // 演算子直後は C では消さない
    if (this.waitingForOperand) {
      return;
    }

    // 現在表示している数字だけをクリア
    this.currentValue = '0';
    this.waitingForOperand = false;
    this.isOverflow = false;
    this.clearPercentState();

    // storedValue / operator / lastOperand は残す
  }


  // =========================================================
  // AC
  // =========================================================

  clearAll(): void {

    this.currentValue = '0';

    this.storedValue = null;
    this.operator = null;

    this.waitingForOperand = false;
    this.justCalculated = false;
    this.isOverflow = false;
    this.resetRepeatState();
  }


  // =========================================================
  // %状態解除
  // =========================================================

  private clearPercentState(): void {

    this.percentMode = false;
    this.percentBase = null;
  }


  // =========================================================
  // 連続計算状態を完全リセット
  // =========================================================

  private resetRepeatState(): void {

    this.lastOperator = null;
    this.lastOperand = null;
    this.previousRightOperand = null;
    this.leftSignChanged = false;
    this.multiplySignChanged = false;

    this.clearPercentState();
  }

  // =========================================================
  // オーバーフロー表示
  // =========================================================

  isOverflow = false;


  // =========================================================
  // 表示用数値整形
  // =========================================================

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      this.isOverflow = true;
      return '0';
    }

    // JS特有の極小の計算誤差（0.1 + 0.2 = 0.30000000000000004など）を吸収するため、
    // 一旦14桁程度の精度で綺麗に整える
    const safeValue = Number(value.toPrecision(14));

    const absValue = Math.abs(safeValue);

    if (absValue >= 10_000_000_000) {
      return this.formatOverflow(safeValue);
    }

    this.isOverflow = false;

    // ---------------------------------------------------------
    // ① 1未満の小数の場合（例：0.666666666...）
    // ---------------------------------------------------------
    if (absValue < 1) {
      // 9桁で「切り捨て」を行う
      const factor = 1_000_000_000;
      const truncated = Math.trunc(safeValue * factor) / factor;

      if (truncated === 0) {
        return '0';
      }

      return truncated
        .toFixed(9)
        .replace(/0+$/, '')
        .replace(/\.$/, '');
    }

    // ---------------------------------------------------------
    // ② 1以上の数値の場合（例：123.456...）
    // ---------------------------------------------------------
    const integerDigits = Math.floor(absValue).toString().length;
    // 整数部を除いた、小数に使える残り桁数を計算（合計10桁）
    const decimalDigits = Math.max(0, 10 - integerDigits);

    // 残り桁数に合わせて「切り捨て」を行う
    const factor = Math.pow(10, decimalDigits);
    const truncated = Math.trunc(safeValue * factor) / factor;

    if (Math.abs(truncated) >= 10_000_000_000) {
      return this.formatOverflow(safeValue);
    }

    return truncated.toString();
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

  private formatOverflow(value: number): string {
    this.isOverflow = true;

    const isNegative = value < 0;
    const absValue = Math.abs(value);

    // 10^10 を基準にする
    const mantissa = absValue / 10_000_000_000;

    // 整数部分の桁数
    let integerDigits = Math.floor(mantissa).toString().length;

    // 整数部分 + 小数部分 = 10桁
    let decimalDigits = Math.max(0, 10 - integerDigits);

    const factor = Math.pow(10, decimalDigits);
    const truncated =
      Math.trunc(mantissa * factor) / factor;

    const mantissaText =
      decimalDigits === 0
        ? truncated.toString()
        : truncated.toFixed(decimalDigits);


    return isNegative
      ? `-${mantissaText}`
      : mantissaText;
  }
  // =========================================================
  // ディスプレイ左端の記号
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

}