from enum import Enum
from random import random


class EngineCard(Enum):  # The values represent the number of copies of an engine card in the game
    H = 8
    CNOT = 7
    X = 5
    SWAP = 3
    PROBE = 1


class EngineStack:
    def __init__(self):
        self.stack = {e: e.value for e in EngineCard}
        self.never_reset = True

    def reset(self):
        self.stack = {e: e.value for e in EngineCard}
        self.never_reset = False

    def empty(self):
        return len(self.stack) == 0

    def draw(self):
        drawn = None
        # TODO Take into account values
        # TODO Take into account the players' current hands
        if self.never_reset:
            del self.stack[EngineCard.PROBE]
            if self.empty():
                return EngineCard.PROBE
            drawn = random.choice(list(self.stack.keys()))
            self.stack[EngineCard.PROBE] = 1
        else:
            drawn = random.choice(list(self.stack.keys()))

        self.stack[drawn] -= self.stack[drawn]
        if self.stack[drawn] == 0:
            del self.stack[drawn]
        return drawn


ENGINE_CONTROL_MAX_SIZE = 6
ENGINE_DECK_INIT_SIZE = 3


class EngineControl:
    def __init__(self):
        self.control = []

    def full(self):
        return len(self.control) == ENGINE_CONTROL_MAX_SIZE

    def add(self, engineCard):
        if self.full():
            raise Exception("Engine Control full ! Engine Card cannot be added")
        self.control.append(engineCard)

    def reset(self):
        self.control = []
