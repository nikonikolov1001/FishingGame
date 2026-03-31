class FiniteStateMachine {
  constructor(owner, initialState) {
    this.owner = owner;
    this.currentState = initialState;
    this.states = new Map();
  }

  addState(name, definition) {
    this.states.set(name, definition);
  }

  setState(nextState, payload = {}) {
    if (this.currentState === nextState || !this.states.has(nextState)) {
      return;
    }

    const current = this.states.get(this.currentState);
    if (current && current.exit) {
      current.exit(this.owner, payload);
    }

    this.currentState = nextState;
    const next = this.states.get(this.currentState);
    if (next && next.enter) {
      next.enter(this.owner, payload);
    }
  }

  update(dt, context) {
    const state = this.states.get(this.currentState);
    if (state && state.update) {
      state.update(this.owner, dt, context);
    }
  }
}

window.FiniteStateMachine = FiniteStateMachine;
