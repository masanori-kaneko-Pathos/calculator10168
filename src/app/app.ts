import { Component } from '@angular/core'
import { CommonModule } from '@angular/common';

type Operator = '+' | '-' | '×' | '÷';

type CalculationSource =
  | 'NONE'
  | 'EQUAL'
  | 'SQRT'
  | 'PERCENT';

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

  // 現在の計算結果が何によってもたらされたか
  calculationSource: CalculationSource = 'NONE';

  // オーバーフロー表示
  isOverflow = false;

  // 演算子を押す前に保存しておく左辺
  storedValue: string | null = null;

  // 現在選択されている演算子
  operator: Operator | null = null;

  // 演算子を押した直後か
  waitingForOperand = false;


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

  // 「%」を押した状態か
  percentMode = false;

  // %を押す直前の左辺 A
  percentBase: string | null = null;

  // %を押したときの右辺 B
  percentOperand: string | null = null;


  // =========================================================
  // 数字入力
  // =========================================================

  inputDigit(digit: string): void {

    if (this.isOverflow) {
      return;
    }

    if (this.calculationSource === 'PERCENT') {
      this.calculationSource = 'NONE';
    }

    // ---------------------------------------------------------
    // √や=などの計算直後
    // ---------------------------------------------------------

    if (
      this.calculationSource === 'SQRT' ||
      this.calculationSource === 'EQUAL'
    ) {
      this.currentValue = digit;
      this.waitingForOperand = false;
      this.isOverflow = false;
      this.calculationSource = 'NONE';
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
    // ---------------------------------------------------------

    if (this.percentMode) {

      this.currentValue = digit;
      this.percentMode = false;
      this.isOverflow = false;

      return;
    }


    // ---------------------------------------------------------
    // 0,-0なら置き換え
    // ---------------------------------------------------------

    if (this.currentValue === '0'
      || this.currentValue === '-0'
    ) {

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

    if (this.currentValue.includes('.')) {
      const parts = this.currentValue.split('.');
      const decimalPart = parts[1]; // 小数点より右側の文字列

      if (decimalPart && decimalPart.length >= 8) {
        // すでに小数第8位まで入力されていたら、入力を無視
        return;
      }
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
    if (
      this.calculationSource === 'SQRT' ||
      this.calculationSource === 'PERCENT' ||
      this.calculationSource === 'EQUAL'
    ) {
      this.currentValue = '0.';
      this.waitingForOperand = false;
      this.calculationSource = 'NONE';
      this.clearPercentState();
      return;
    }


    // 演算子直後
    if (this.waitingForOperand) {

      this.currentValue = '0.';
      this.waitingForOperand = false;
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

    const currentNumber = this.currentValue;
    // ---------------------------------------------------------
    // √の直後に演算子を押した場合
    // ---------------------------------------------------------

    if (this.operator === null) {

      if (this.calculationSource === 'SQRT') {
        // √の結果を新しい左辺として扱う
        this.storedValue = currentNumber;

        // 今押された演算子を新しい演算子にする
        this.operator = nextOperator;

        this.waitingForOperand = true;
        this.calculationSource = 'NONE';
        return;
      }




      // ---------------------------------------------------------
      // 計算直後に演算子を押した場合
      // ---------------------------------------------------------


      if (this.calculationSource === 'EQUAL') {
        if (nextOperator === '×') {

          // C × ?
          // 「=」で C を右辺に入れる
          this.previousRightOperand = currentNumber;

        } else if (nextOperator === '÷') {

          // C ÷ ?
          // 「=」で 1 を右辺に入れる
          this.previousRightOperand = '1';

        } else {

          // + / -
          // 従来どおり、元の右辺を使う
          this.previousRightOperand = this.lastOperand;
        }

        this.storedValue = currentNumber;
        this.operator = nextOperator;

        this.waitingForOperand = true;
        this.calculationSource = 'NONE';
        this.clearPercentState();

        return;
      }
    }


    // ---------------------------------------------------------
    // %直後に演算子を押した場合
    //
    // %で作られた表示値を次の計算の左辺として使う。
    // ---------------------------------------------------------

    if (this.percentMode) {
      // %で表示されている値を、そのまま新しい左辺にする
      this.storedValue = currentNumber;
      this.previousRightOperand = null;
      this.operator = nextOperator;
      this.waitingForOperand = true;
      this.calculationSource = 'NONE';
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
      this.operator !== null &&  // 演算子が入力されていて
      this.storedValue !== null &&  // かつ右辺もあって
      !this.waitingForOperand  //  演算子待ちではないなら
    ) {
      const result = this.calculateResult(
        this.storedValue,
        currentNumber,
        this.operator
      );

      const resultStr = this.formatNumber(result);

      if (nextOperator === '×') {
        // 計算結果自体を次の右辺にする
        this.previousRightOperand = resultStr;
      } else if (nextOperator === '÷') {
        // ÷の連続は右辺を1にする
        this.previousRightOperand = '1';
      } else {
        // +と-はそのまま
        this.previousRightOperand = currentNumber;
      }
      // 計算結果を次の左辺に
      this.currentValue = resultStr;
      this.storedValue = this.currentValue;
    } else {

      // 最初の演算子
      this.storedValue = currentNumber;

      // 演算子の付け替え（5 + ×）ではなく新しい計算の開始なら、
      // 前の計算の右辺は引き継がない
      if (!this.waitingForOperand) {
        this.previousRightOperand = null;
      } else {
        // + や - は直前の右辺を維持するが、× や ÷ に付け替えた場合はリセットする
        if (nextOperator === '×' || nextOperator === '÷') {
          this.previousRightOperand = null;
        }
      }

    }


    this.operator = nextOperator;
    this.waitingForOperand = true;
  }


  // =========================================================
  // %
  // =========================================================
  inputPercent(): void {

    if (this.isOverflow) {
      return;
    }

    const currentNumber = this.currentValue;
    let finalResult = '0';

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
      this.waitingForOperand = false;
      this.calculationSource = 'PERCENT';
      this.resetRepeatState();
      return;
    }

    // =======================================================
    // 除算ですでに ÷ % を押している場合
    // =======================================================

    if (
      this.operator === '÷' &&
      this.percentBase !== null &&
      this.percentOperand === null
    ) {

      const divisor =
        this.percentBase;

      const pct = this.calculateResult('100', divisor, '÷');
      const result = this.calculateResult(this.currentValue, pct, '×');

      this.currentValue = this.formatNumber(result);
      this.waitingForOperand = false;
      this.calculationSource = 'PERCENT';
      this.percentMode = true;
      return;
    }


    const base = this.storedValue;

    // =======================================================
    // =======================================================
    // 右辺が存在しない場合
    // =======================================================
    // =======================================================
    if (this.waitingForOperand) {
      // -------------------------------------------------------
      // 50 +/- %
      // → 50 +/- のまま
      // -------------------------------------------------------
      if (this.operator === '+' || this.operator === '-') {
        this.currentValue = this.formatNumber(base);
        return;
      }

      this.percentOperand = null;
      this.percentBase = base;
      this.percentMode = true;


      // -------------------------------------------------------
      // ×
      //
      // 50 × %
      // → 25
      // -------------------------------------------------------
      if (this.operator === '×') {

        const pct = this.calculateResult(base, '100', '÷');
        finalResult = this.calculateResult(base, pct, '×');

      }

      // -------------------------------------------------------
      // ÷
      //
      // 50 ÷ %
      // → 2
      // -------------------------------------------------------
      else if (this.operator === '÷') {

        finalResult = this.calculateResult('100', base, '÷');

      }
    }

    // =======================================================
    // =======================================================
    // 右辺が存在する場合
    // =======================================================
    // =======================================================

    else {
      this.percentBase = base;

      // ÷ は最初の percentOperand を保持
      if (this.operator === '÷' && this.percentOperand !== null) {

        const pct = this.calculateResult(
          this.percentOperand,
          '100',
          '÷'
        );

        finalResult = this.calculateResult(
          currentNumber,
          pct,
          '÷'
        );

      } else {

        // + / - / × は今回の右辺を保存
        this.percentOperand = currentNumber;

        const curPct = this.calculateResult(
          currentNumber,
          '100',
          '÷'
        );

        if (this.operator === '+' || this.operator === '-') {
          const delta = this.calculateResult(
            base,
            curPct,
            '×'
          );

          finalResult = this.calculateResult(
            base,
            delta,
            this.operator
          );

        } else if (this.operator === '×') {
          finalResult = this.calculateResult(
            base,
            curPct,
            '×'
          );
        } else if (this.operator === '÷') {
          // 1回目の ÷ %
          finalResult = this.calculateResult(
            base,
            curPct,
            '÷'
          );
        }
      }
    }




    // %を押した状態として記録
    this.percentMode = true;
    this.waitingForOperand = false;
    this.calculationSource = 'PERCENT';

    this.currentValue = this.formatNumber(finalResult);
  }



  // =========================================================
  // √
  // =========================================================

  inputSquareRoot(): void {
    if (this.isOverflow) {
      return;
    }

    // 現在の値を取得
    const valueStr = this.currentValue;

    // 負数の平方根
    if (valueStr.startsWith('-')) {
      this.currentValue = '0';
      this.isOverflow = true;
      this.calculationSource = 'SQRT';
      this.operator = null;
      this.waitingForOperand = false;
      this.resetRepeatState();

      return;
    }
    if (valueStr === '0') {
      this.calculationSource = 'SQRT';
      this.waitingForOperand = false;
      return;
    }

    const [intPart, fracPart = ''] = valueStr.split('.');

    // fromScaledBigInt(10^16スケール)で正しい位置に小数点を戻すためには、
    // 計算前に「10^32倍」にしておく必要があります（ √10^32 = 10^16 になるため）
    const paddedFrac = fracPart.padEnd(32, '0').slice(0, 32);
    const bigVal = BigInt(intPart + paddedFrac);

    // ニュートン法でBigIntの平方根を計算
    const resultBigInt = this.bigIntSqrt(bigVal);

    // 10^16スケールのBigIntとして文字列に戻す
    const resultStr = this.fromScaledBigInt(resultBigInt);

    // 表示用に整形
    this.currentValue = this.formatNumber(resultStr);

    this.waitingForOperand = false;

    // ％モードの魔法がかかっている最中は、PERCENTステートを維持する
    if (!this.percentMode) {
      this.calculationSource = 'SQRT';
    }

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
      this.operator === null &&
      this.lastOperator !== null &&
      this.lastOperand !== null
    ) {

      const currentNumber = this.currentValue;
      const result = this.calculateResult(
        currentNumber,
        this.lastOperand,
        this.lastOperator
      );

      this.currentValue = this.formatNumber(result);
      this.calculationSource = 'EQUAL';

      return;
    }




    // =========================================================
    // %特殊処理
    // =========================================================
    if (
      this.percentMode &&
      this.percentBase !== null
    ) {
      const percentResult = this.currentValue;
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
          currentOperator);

        this.currentValue =
          this.formatNumber(result);

        this.lastOperator = currentOperator;

        // 次の連続 = では元の左辺を繰り返す
        this.lastOperand = base;

        this.storedValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.calculationSource = 'EQUAL';

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
        this.calculationSource = 'EQUAL';
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

        if (divisor === null) {
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
        this.calculationSource = 'EQUAL';

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
        this.calculationSource = 'EQUAL';

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
        let implicitLeftValue = '0';
        if (currentOperator === '×') {
          implicitLeftValue = rightValue; // 10 × = は 10 × 10 にする
        } else if (currentOperator === '÷') {
          implicitLeftValue = '1';          // 10 ÷ = は 1 ÷ 10 にする
        }

        const result = this.calculateResult(
          implicitLeftValue,
          rightValue,
          currentOperator
        );

        this.currentValue = this.formatNumber(result);
        this.lastOperator = currentOperator;
        this.lastOperand = rightValue;

        this.storedValue = null;
        this.operator = null;
        this.waitingForOperand = false;
        this.calculationSource = 'EQUAL';

        this.clearPercentState();

        return;
      }
    }
    // =========================================================
    // 演算子がない、または通常の = （1 + 3 = など）
    // =========================================================

    if (
      this.operator === null ||
      this.storedValue === null
    ) {
      this.calculationSource = 'EQUAL';
      return;
    }

    const currentNumber = this.currentValue;
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
    this.calculationSource = 'EQUAL';

    this.clearPercentState();
  }



  // =========================================================
  // 四則演算 （ BigIntを導入 ）
  // =========================================================
  private calculateResult(
    leftStr: string,
    rightStr: string,
    operator: Operator):
    string {
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

    if (this.isOverflow) {
      return;
    }

    // =========================================================
    // 演算子直後の ±
    // → 演算子の左側にある数字を反転する
    // → + - × ÷ 共通
    // =========================================================
    if (this.waitingForOperand && this.operator !== null) {
      if (this.storedValue !== null) {
        const wasSame = this.operator === '×' && this.previousRightOperand === this.storedValue; // 反転前
        this.storedValue = this.storedValue.startsWith('-')
          ? this.storedValue.slice(1)
          : '-' + this.storedValue;
        if (wasSame) this.previousRightOperand = this.storedValue;
        this.currentValue = this.formatNumber(this.storedValue);
      }
      return;
    }

    const wasSame = this.operator === '×' && this.previousRightOperand === this.storedValue; // 反転前
    this.currentValue = this.currentValue.startsWith('-')
      ? this.currentValue.slice(1)
      : '-' + this.currentValue;
    if (wasSame) this.previousRightOperand = this.storedValue;
  }

  // =========================================================
  // C
  // =========================================================

  clear(): void {

    if (this.isOverflow) {
      return;
    }

    // 計算結果表示中は C では消さない
    // AC なら clearAll() で完全に消せる
    if (this.calculationSource === 'EQUAL') {
      return;
    }

    // 演算子直後は C では消さない
    if (this.waitingForOperand) {
      return;
    }

    //%を用いた計算結果は消さない
    if (this.percentMode
      && this.calculationSource === 'PERCENT') {
      return;
    }

    // 現在表示している数字だけをクリア
    this.currentValue = '0';
    this.waitingForOperand = false;
    this.calculationSource = 'NONE';
    this.isOverflow = false;
    this.clearPercentState();

  }


  // =========================================================
  // AC
  // =========================================================

  clearAll(): void {

    this.currentValue = '0';
    this.storedValue = null;
    this.operator = null;

    this.waitingForOperand = false;
    this.isOverflow = false;
    this.calculationSource = 'NONE';
    this.resetRepeatState();
  }


  // =========================================================
  // %状態解除
  // =========================================================

  private clearPercentState(): void {

    this.percentMode = false;
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

    const val = Number(valueStr);
    const isNegative = val < 0;
    const absVal = Math.abs(val);

    // 10^10 を基準にする
    const mantissa = absVal / 10_000_000_000;

    let str = mantissa.toString();
    if (str.includes('e') || str.includes('E')) {
      str = mantissa.toFixed(20);
    }

    const [intPart, fracPart = ''] = str.split('.');
    const decimalDigits = Math.min(8, Math.max(0, 10 - intPart.length));
    const truncatedFrac = fracPart.slice(0, decimalDigits);

    // 表示は常に小数部を桁数ぶん0埋めする（E1.00000000）
    const mantissaText =
      decimalDigits === 0
        ? `${intPart}.`
        : `${intPart}.${truncatedFrac.padEnd(decimalDigits, '0')}`;


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
    if (this.percentMode) {
      return '';
    }
    return this.operator ?? '';
  }


}