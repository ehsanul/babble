const WIDTH = 15;
const HEIGHT = 15;

let DICTIONARY = new Set();
(async function () {
  const response = await fetch("words.txt");
  DICTIONARY = new Set((await response.text()).split("\r\n"));
})();

const POUCH_START = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
  " ": 2,
};

let state = {
  gameState: "unstarted",
  pouch: [],
  p1: {
    name: null,
    letters: [],
  },
  p2: {
    name: null,
    letters: [],
  },
  board: [],
};

function startNewGame() {
  state.gameState = "in-progress";
  state.pouch = [];
  state.p1.letters = [];
  state.p2.letters = [];
  state.board = Array.from(Array(WIDTH * HEIGHT).keys()).map((n) => {
    return { letter: null, finalized: false };
  });
  for (const [letter, count] of Object.entries(POUCH_START)) {
    for (let i = 0; i < count; i++) {
      state.pouch.push(letter);
    }
  }
}

function fillLetters(letters) {
  while (state.pouch.length > 0 && letters.length < 7) {
    let randomIndex = Math.floor(Math.random() * state.pouch.length);
    let randomLetter = state.pouch.splice(randomIndex, 1)[0];
    letters.push(randomLetter);
  }
}

function currentPlayerName() {
  return localStorage.getItem("player-name");
}

function currentPlayer() {
  if (state.p1.name && state.p1.name === currentPlayerName()) {
    return state.p1;
  } else if (state.p2.name && state.p2.name === currentPlayerName()) {
    return state.p2;
  } else {
    setupPlayerName();
    return currentPlayer();
  }
}

function setupPlayerName() {
  if (state.p1.name == null) {
    const name = currentPlayerName() || prompt("Enter your name");
    if (name != null && name != "") {
      localStorage.setItem("player-name", name);
      state.p1.name = name;
    } else {
      showError(); // TODO
      setupPlayerName();
    }
  } else if (state.p1.name != null && state.p2.name == null) {
    const name = currentPlayerName() || prompt("Enter your name");
    if (name != null && name != "" && name != state.p1.name) {
      localStorage.setItem("player-name", name);
      state.p2.name = name;
    } else {
      showError(); // TODO
      setupPlayerName();
    }
  } else if (currentPlayerName() != null) {
    showError(); // TODO you can't play this game, not yours
    throw new Error("Couldn't set current player");
  } else {
    // TODO probably changed browsers or cleared local storage, so we have
    // to allow selecting which player you are
  }
}

function placeLetter(x, y, letter) {
  let index = currentPlayer().letters.indexOf(letter);
  if (index < 0) {
    throw new Error("Could not find letter: " + letter);
  }

  // remove the letter
  currentPlayer().letters.splice(index, 1)[0];

  // and add it to board
  // TODO replace with getter/setter function
  // FIXME don't allow this if there's already a letter there!
  let boardIndex = y * HEIGHT + x;
  state.board[boardIndex] = { letter, finalized: false };

  console.log(findNewBoardWords())
  render();
}

const VERTICAL = 0
const HORIZONTAL = 1

function findNewBoardWords() {
  let boardWords = [];
  let currentWord = "";
  let allFinalized = true;
  let start = {};

  function init(x, y) {
    currentWord = "";
    allFinalized = true;
    start = {x, y}
  }

  function processCell(x, y, direction) {
    let boardIndex = y * HEIGHT + x;
    let { letter, finalized } = state.board[boardIndex];

    if (letter) {
      currentWord += letter;
      allFinalized &&= finalized;
    } else {
      if (currentWord.length >= 2 && !allFinalized) {
        const boardWord = {
          word: currentWord,
          start: start,
          end: {x, y},
        }

        // ensure the end indices are inclusive
        if (direction == VERTICAL) {
          boardWord.end.y -= 1
        } else {
          boardWord.end.x -= 1
        }

        boardWords.push(boardWord);
      }

      if (direction == VERTICAL) {
        init(x, y + 1)
      } else {
        init(x + 1, y)
      }
    }
  }

  // TODO
  // iterateBoard(init, processCell)

  // searching for words vertically
  for (let x = 0; x < WIDTH; x++) {
    init(x, 0)
    for (let y = 0; y < HEIGHT; y++) {
      processCell(x, y, VERTICAL);
    }
  }

  // searching for words horizontally
  for (let y = 0; y < HEIGHT; y++) {
    init(0, y)
    for (let x = 0; x < WIDTH; x++) {
      processCell(x, y, HORIZONTAL);
    }
  }

  return boardWords;
}

function finalizeTurn() {
  // validate position of letters (must be in straight line, all consecutive letters (no empty board space between)

  const newBoardWords = findNewBoardWords()

  // validate the words
  const invalidWords = newBoardWords.map((bw) => bw.word).filter((word) => !DICTIONARY.has(word))
  if (invalidWords.length > 0) {
    showError(`Words are not valid: ${ invalidWords.join(', ') }`) // TODO
    return
  }
  // calculate points of new words
  // store points in state
  // update state of board and whose turn it is
  // store state in backend
}

function render() {
  const boardEl = document.getElementById("babble-board");
  const letterDisplayEl = document.getElementById("letter-display");
  const rows = [];
  for (let y = 0; y < HEIGHT; y++) {
    let row = [];
    for (let x = 0; x < WIDTH; x++) {
      // TODO replace with getter/setter function
      let index = y * HEIGHT + x;
      row.push(`
                <td x="${x}" y="${y}">
                    ${state.board[index].letter || ""}
                </td>
            `);
    }
    rows.push(`
            <tr>
                ${row.join("\n")}
            </tr>
        `);
  }
  boardEl.innerHTML = `
        <table>
            ${rows.join("\n")}
        </table>
    `;

  letterDisplayEl.innerHTML = `
        <div>
            ${currentPlayer()
              .letters.map((l) => `<button>${l}</button>`)
              .join("\n")}
        </div>
    `;
}

let letterInHand = null;
document.addEventListener("click", function (event) {
  if (event.target.tagName === "BUTTON") {
    // TODO make this proper selector? or use classname
    letterInHand = event.target.innerText;
  }
  if (event.target.tagName === "TD") {
    const x = parseInt(event.target.attributes.x.value, 10);
    const y = parseInt(event.target.attributes.y.value, 10);
    console.log({ x, y, letterInHand });
    placeLetter(x, y, letterInHand);
  }
  render();
  return false;
});

if (state.gameState === "unstarted") {
  startNewGame();
}
fillLetters(state.p1.letters);
fillLetters(state.p2.letters);
render();
