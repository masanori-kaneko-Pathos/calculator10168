import { App } from './app';

describe('電卓 App', () => {

  let app: App;

  beforeEach(() => {
    app = new App();
  });


  // =========================================================
  // ヘルパー
  // =========================================================

  function pressDigits(value: string): void {
    for (const digit of value) {
      app.inputDigit(digit);
    }
  }

  function expectDisplay(expected: string): void {
    expect(app.currentValue).toBe(expected);
  }


  // =========================================================
  // 基本計算
  // =========================================================

  describe('基本計算', () => {

    it('加算ができる', () => {
      pressDigits('10');
      app.inputOperator('+');
      pressDigits('20');
      app.calculate();

      expectDisplay('30');
    });


    it('減算ができる', () => {
      pressDigits('10');
      app.inputOperator('-');
      pressDigits('3');
      app.calculate();

      expectDisplay('7');
    });


    it('乗算ができる', () => {
      pressDigits('10');
      app.inputOperator('×');
      pressDigits('2');
      app.calculate();

      expectDisplay('20');
    });


    it('除算ができる', () => {
      pressDigits('10');
      app.inputOperator('÷');
      pressDigits('2');
      app.calculate();

      expectDisplay('5');
    });

  });


  // =========================================================
  // + の連続 =
  // =========================================================

  describe('+ の連続計算', () => {

    it('A+B=C のあと = で +B が繰り返される', () => {
      pressDigits('10');
      app.inputOperator('+');
      pressDigits('2');
      app.calculate();

      expectDisplay('12');

      app.calculate();
      expectDisplay('14');

      app.calculate();
      expectDisplay('16');

      app.calculate();
      expectDisplay('18');
    });


    it('A+B=C のあと += では B+C になり、その後 +C が繰り返される', () => {
      pressDigits('10');
      app.inputOperator('+');
      pressDigits('2');
      app.calculate();

      expectDisplay('12');

      app.inputOperator('+');
      app.calculate();

      // 2 + 12
      expectDisplay('14');

      app.calculate();

      // 14 + 12
      expectDisplay('26');

      app.calculate();

      // 26 + 12
      expectDisplay('38');
    });

  });


  // =========================================================
  // - の連続 =
  // =========================================================

  describe('- の連続計算', () => {

    it('A-B=C のあと = で -B が繰り返される', () => {
      pressDigits('10');
      app.inputOperator('-');
      pressDigits('2');
      app.calculate();

      expectDisplay('8');

      app.calculate();
      expectDisplay('6');

      app.calculate();
      expectDisplay('4');

      app.calculate();
      expectDisplay('2');
    });


    it('A-B=C のあと -= では B-C になり、その後 -C が繰り返される', () => {
      pressDigits('10');
      app.inputOperator('-');
      pressDigits('2');
      app.calculate();

      expectDisplay('8');

      app.inputOperator('-');
      app.calculate();

      // 2 - 8
      expectDisplay('-6');

      app.calculate();

      // -6 - 8
      expectDisplay('-14');

      app.calculate();

      // -14 - 8
      expectDisplay('-22');
    });

  });


  // =========================================================
  // ★ × の連続 =
  // =========================================================

  describe('× の連続計算', () => {

    it('A×B=C のあと = で ×A が繰り返される', () => {
      pressDigits('10');
      app.inputOperator('×');
      pressDigits('2');
      app.calculate();

      // A×B = C
      expectDisplay('20');

      app.calculate();

      // C×A = 20×10
      expectDisplay('200');

      app.calculate();

      // 200×10
      expectDisplay('2000');

      app.calculate();

      // 2000×10
      expectDisplay('20000');
    });


    it('A×B=C のあと ×= では C×C になる', () => {
      pressDigits('10');
      app.inputOperator('×');
      pressDigits('2');
      app.calculate();

      // C = 20
      expectDisplay('20');

      app.inputOperator('×');
      app.calculate();

      // C×C
      // 20×20 = 400
      expectDisplay('400');
    });


    it('A×B=C のあと ×= の次の = では D×C になる', () => {
      pressDigits('10');
      app.inputOperator('×');
      pressDigits('2');
      app.calculate();

      // C = 20
      expectDisplay('20');

      app.inputOperator('×');
      app.calculate();

      // C×C = 400
      expectDisplay('400');

      app.calculate();

      // D×C
      // 400×20 = 8000
      expectDisplay('8000');

      app.calculate();

      // 8000×20 = 160000
      expectDisplay('160000');
    });


    it('10×2=== は 20 → 200 → 2000 → 20000 になる', () => {
      pressDigits('10');
      app.inputOperator('×');
      pressDigits('2');

      app.calculate();
      expectDisplay('20');

      app.calculate();
      expectDisplay('200');

      app.calculate();
      expectDisplay('2000');

      app.calculate();
      expectDisplay('20000');
    });


    it('10×2=×=== は 20 → 400 → 8000 → 160000 になる', () => {
      pressDigits('10');
      app.inputOperator('×');
      pressDigits('2');

      app.calculate();
      expectDisplay('20');

      app.inputOperator('×');
      app.calculate();
      expectDisplay('400');

      app.calculate();
      expectDisplay('8000');

      app.calculate();
      expectDisplay('160000');
    });

  });


  // =========================================================
  // ★ ÷ の連続 =
  // =========================================================

  describe('÷ の連続計算', () => {

    it('A÷B=C のあと = で ÷B が繰り返される', () => {
      pressDigits('100');
      app.inputOperator('÷');
      pressDigits('2');
      app.calculate();

      expectDisplay('50');

      app.calculate();

      // 50÷2
      expectDisplay('25');

      app.calculate();

      // 25÷2
      expectDisplay('12.5');
    });


    it('A÷B=C のあと ÷= では 1÷C になる', () => {
      pressDigits('10');
      app.inputOperator('÷');
      pressDigits('2');
      app.calculate();

      // C = 5
      expectDisplay('5');

      app.inputOperator('÷');
      app.calculate();

      // 1÷C
      // 1÷5 = 0.2
      expectDisplay('0.2');
    });


    it('A÷B=C のあと ÷= の次の = では D÷C になる', () => {
      pressDigits('10');
      app.inputOperator('÷');
      pressDigits('2');
      app.calculate();

      // C = 5
      expectDisplay('5');

      app.inputOperator('÷');
      app.calculate();

      // 1÷5 = 0.2
      expectDisplay('0.2');

      app.calculate();

      // D÷C
      // 0.2÷5 = 0.04
      expectDisplay('0.04');

      app.calculate();

      // 0.04÷5 = 0.008
      expectDisplay('0.008');
    });


    it('10÷2=== は 5 → 2.5 → 1.25 → 0.625 になる', () => {
      pressDigits('10');
      app.inputOperator('÷');
      pressDigits('2');

      app.calculate();
      expectDisplay('5');

      app.calculate();
      expectDisplay('2.5');

      app.calculate();
      expectDisplay('1.25');

      app.calculate();
      expectDisplay('0.625');
    });


    it('10÷2=÷=== は 5 → 0.2 → 0.04 → 0.008 になる', () => {
      pressDigits('10');
      app.inputOperator('÷');
      pressDigits('2');

      app.calculate();
      expectDisplay('5');

      app.inputOperator('÷');
      app.calculate();
      expectDisplay('0.2');

      app.calculate();
      expectDisplay('0.04');

      app.calculate();
      expectDisplay('0.008');
    });

  });


  // =========================================================
  // 演算子切り替え
  // =========================================================

  describe('演算子切り替え', () => {

    it('右辺入力後に演算子を変更すると途中計算される', () => {
      pressDigits('10');
      app.inputOperator('+');
      pressDigits('2');

      app.inputOperator('×');

      // 10+2 が先に計算されて 12×
      expectDisplay('12');

      pressDigits('3');
      app.calculate();

      expectDisplay('36');
    });

  });


  // =========================================================
  // ±
  // =========================================================

  describe('±', () => {

    it('通常の数字を反転できる', () => {
      pressDigits('5');
      app.toggleSign();

      expectDisplay('-5');

      app.toggleSign();

      expectDisplay('5');
    });


    it('0 は -0 にならない', () => {
      app.toggleSign();

      expectDisplay('0');
    });


    it('演算子直後の ± では左辺を反転する', () => {
      pressDigits('10');
      app.inputOperator('+');

      app.toggleSign();

      expectDisplay('-10');
    });


    it('±後の掛け算が正しく計算される', () => {
      pressDigits('10');
      app.inputOperator('×');

      app.toggleSign();

      pressDigits('2');
      app.calculate();

      expectDisplay('-20');
    });

  });


  // =========================================================
  // %
  // =========================================================

  describe('%', () => {

    it('50 + 20% = 60', () => {
      pressDigits('50');
      app.inputOperator('+');
      pressDigits('20');
      app.inputPercent();

      expectDisplay('60');
    });


    it('50 - 20% = 40', () => {
      pressDigits('50');
      app.inputOperator('-');
      pressDigits('20');
      app.inputPercent();

      expectDisplay('40');
    });


    it('50 × 20% = 10', () => {
      pressDigits('50');
      app.inputOperator('×');
      pressDigits('20');
      app.inputPercent();

      expectDisplay('10');
    });


    it('50 ÷ 20% = 250', () => {
      pressDigits('50');
      app.inputOperator('÷');
      pressDigits('20');
      app.inputPercent();

      expectDisplay('250');
    });


    it('50 × 20% = のあと連続 = が 500 → 25000 になる', () => {
      pressDigits('50');
      app.inputOperator('×');
      pressDigits('20');
      app.inputPercent();

      app.calculate();
      expectDisplay('500');

      app.calculate();
      expectDisplay('25000');
    });

  });


  // =========================================================
  // √
  // =========================================================

  describe('√', () => {

    it('√9 = 3', () => {
      pressDigits('9');
      app.inputSquareRoot();

      expectDisplay('3');
    });


    it('√を連続すると平方根を繰り返す', () => {
      pressDigits('256');

      app.inputSquareRoot();
      expectDisplay('16');

      app.inputSquareRoot();
      expectDisplay('4');

      app.inputSquareRoot();
      expectDisplay('2');

      app.inputSquareRoot();
      expectDisplay('1.414213562');
    });


    it('負数の√ではオーバーフロー状態になる', () => {
      pressDigits('9');
      app.toggleSign();

      app.inputSquareRoot();

      expect(app.isOverflow).toBeTrue();
      expectDisplay('0');
    });

  });


  // =========================================================
  // C / AC
  // =========================================================

  describe('C / AC', () => {

    it('C は現在入力中の数字だけをクリアする', () => {
      pressDigits('10');
      app.inputOperator('+');
      pressDigits('25');

      app.clear();

      expectDisplay('0');

      // 左辺と演算子は残っているので
      pressDigits('5');
      app.calculate();

      expectDisplay('15');
    });


    it('計算直後の C は結果を消さない', () => {
      pressDigits('10');
      app.inputOperator('+');
      pressDigits('5');
      app.calculate();

      expectDisplay('15');

      app.clear();

      expectDisplay('15');
    });


    it('AC はすべてリセットする', () => {
      pressDigits('10');
      app.inputOperator('×');
      pressDigits('2');
      app.calculate();

      app.clearAll();

      expectDisplay('0');
      expect(app.storedValue).toBeNull();
      expect(app.operator).toBeNull();
      expect(app.lastOperator).toBeNull();
      expect(app.lastOperand).toBeNull();
      expect(app.justCalculated).toBeFalse();
    });

  });


  // =========================================================
  // 10桁入力制限
  // =========================================================

  describe('10桁入力制限', () => {

    it('整数は10桁まで入力できる', () => {
      pressDigits('1234567890');

      expectDisplay('1234567890');
    });


    it('11桁目は入力されない', () => {
      pressDigits('12345678901');

      expectDisplay('1234567890');
    });


    it('マイナス記号は桁数に含めない', () => {
      pressDigits('1234567890');
      app.toggleSign();

      expectDisplay('-1234567890');
    });

  });


  // =========================================================
  // 表示フォーマット
  // =========================================================

  describe('表示フォーマット', () => {

    it('小数は整数部分と小数部分の合計10桁を基本にする', () => {
      pressDigits('1');
      app.inputDecimal();
      pressDigits('123456789');

      expectDisplay('1.123456789');
    });


    it('1未満の値は小数9桁まで扱う', () => {
      pressDigits('1');
      app.inputOperator('÷');
      pressDigits('8');
      app.calculate();

      expectDisplay('0.125');
    });


    it('10,000,000,000以上では指数表示になる', () => {
      pressDigits('1000000000');
      app.inputOperator('×');
      pressDigits('10');
      app.calculate();

      expect(app.isOverflow).toBeTrue();
      expectDisplay('1.000000000');
    });

  });


  // =========================================================
  // 重要：今回の特殊仕様をまとめて検証
  // =========================================================

  describe('今回の特殊な ×= / ÷= 仕様', () => {

    it('10×2=×=== の内部遷移を検証する', () => {

      // 10×2
      pressDigits('10');
      app.inputOperator('×');
      pressDigits('2');

      // =
      app.calculate();
      expectDisplay('20');

      // ×=
      app.inputOperator('×');
      app.calculate();
      expectDisplay('400');

      // =
      app.calculate();
      expectDisplay('8000');

      // =
      app.calculate();
      expectDisplay('160000');

      // =
      app.calculate();
      expectDisplay('3200000');
    });


    it('10÷2=÷=== の内部遷移を検証する', () => {

      // 10÷2
      pressDigits('10');
      app.inputOperator('÷');
      pressDigits('2');

      // =
      app.calculate();
      expectDisplay('5');

      // ÷=
      app.inputOperator('÷');
      app.calculate();
      expectDisplay('0.2');

      // =
      app.calculate();
      expectDisplay('0.04');

      // =
      app.calculate();
      expectDisplay('0.008');

      // =
      app.calculate();
      expectDisplay('0.0016');
    });

  });

});