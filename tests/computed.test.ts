import Controller, { def } from "./adapter";

describe("ordered computed", () => {
  let computed: string[];
  beforeEach(() => computed = []);

  class Test extends Controller {
    X = 1;

    get A(){
      const value = this.X 
      computed.push("A")
      return value;
    };
    get B(){
      const value = this.A + 1 
      computed.push("B")
      return value;
    };
    get C(){
      const value = this.X + this.B + 1
      computed.push("C")
      return value;
    };
    get D(){
      const value = this.A + this.C + 1
      computed.push("D")
      return value;
    };
  }

  it("computed values are evaluated in-order", async () => {
    const test = Test.create();

    // initialize D, should cascade to dependants
    expect(test.D).toBe(6);
    await test.requestUpdate();
    // should evaluate in order, by use
    expect(computed).toMatchObject(["A", "B", "C", "D"]);

    // empty computed
    computed = [];

    // change value of X, will trigger A & C;
    test.X = 2;
    const updated = await test.requestUpdate();

    // should evaluate by prioritiy
    expect(computed).toMatchObject(["A", "B", "C", "D"]);
    expect(updated).toMatchObject(["X", "A", "B", "C", "D"]);
  })
})

describe("overriding computed", () => {
  class A extends Controller {
    a = "foo";
    b = def("foo");
    get c(){ return "foo" }
    get d(){ return "foo" }
  }

  class B extends A {
    get a(){ return "bar" }
    get b(){ return "bar" }
    get c(){ return "bar" }
    d = "bar";
  }

  test("B getter wont override A value", () => {
    const test = B.create();
    expect(test.a).toBe("foo");
  })

  test("B getter will override A default", () => {
    const test = B.create();
    expect(test.b).toBe("bar");
  })

  test("B getter will override A getter", () => {
    const test = B.create();
    expect(test.c).toBe("bar");
  })

  test("B value will override A getter", () => {
    const test = B.create();
    expect(test.d).toBe("bar");
  })
})

describe.skip("recursive computed", () => {
  class Test extends Controller {
    value = 0;
    isEven = true;

    get format(){
      const { value, isEven } = this;
      const parity = isEven ? "even" : "odd";
      const quote = `Value ${value} is ${parity}`;

      this.isEven = value % 1 == 0;
      
      return quote;
    }
  }

  it("getter may cause its own update", async () => {
    const test = Test.create();

    expect(test.format).toBe("Value 0 is even");
    test.value++;
    await test.requestUpdate();
    expect(test.format).toBe("Value 1 is odd");
  })
})