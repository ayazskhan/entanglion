from enum import Enum
from random import random


class EngineCard(Enum):  # The values represent the total number of an engine card in the game
    H = 8
    CNOT = 7
    X = 5
    SWAP = 3
    PROBE = 1


class EngineStack:
    def __init__(self):
        self.deck = {e: e.value for e in EngineCard}
        self.never_reset = True

    def reset(self):
        self.deck = {e: e.value for e in EngineCard}
        self.never_reset = False

    def empty(self):
        return len(self.deck) == 0

    def draw(self):
        drawn = None
        if self.never_reset:
            del self.deck[EngineCard.PROBE]
            if self.empty():
                return EngineCard.PROBE
            drawn = random.choice(list(self.deck.keys()))
            self.deck[EngineCard.PROBE] = 1
        else:
            drawn = random.choice(list(self.deck.keys()))

        self.deck[drawn] -= self.deck[drawn]
        if self.deck[drawn] == 0:
            del self.deck[drawn]
        return drawn


ENGINE_CONTROL_SIZE = 6


class EngineControl:
    def __init__(self):
        self.control = {i: None for i in range(6)}
        self.size = 0

    def full(self):
        return self.size == ENGINE_CONTROL_SIZE

    def add(self, engineCard):
        if self.full():
            raise Exception("Engine Control full ! Engine Card cannot be added")
        self.control[self.size] = engineCard
        self.size += 1