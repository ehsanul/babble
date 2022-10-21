const WIDTH = 15;
const HEIGHT = 15;

// TODO switch to Trie
let DICTIONARY = new Set();
(async function () {
  const response = await fetch("words.txt");
  DICTIONARY = new Set((await response.text()).split("\n"));
})();

const LETTER_POINTS = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
  " ": 0,
};

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

// Author: Abhishek Dutta, 12 June 2020
// License: CC0 (https://creativecommons.org/choose/zero/)
function uuid() {
  var temp_url = URL.createObjectURL(new Blob());
  var uuid = temp_url.toString();
  URL.revokeObjectURL(temp_url);
  return uuid.substr(uuid.lastIndexOf("/") + 1); // remove prefix (e.g. blob:null/, blob:www.test.com/, ...)
}

let state = {
  gameId: null,
  gameState: "unknown",
  sequence: 0,
  pouch: [],
  p1: {
    name: null,
    letters: [],
    turn: true,
    score: 0,
  },
  p2: {
    name: null,
    letters: [],
    turn: false,
    score: 0,
  },
  board: [],
};

function showError(message) {
  // TODO make this nicer
  alert(message);
}

function startNewGame() {
  state.gameId = uuid();
  state.gameState = "in-progress";
  state.pouch = [];
  state.p1.letters = [];
  state.p2.letters = [];
  state.p1.turn = true;
  state.p2.turn = false;
  state.p1.score = 0;
  state.p2.score = 0;
  state.board = Array.from(Array(WIDTH * HEIGHT).keys()).map((n) => {
    return { letter: null, finalized: false };
  });
  for (const [letter, count] of Object.entries(POUCH_START)) {
    for (let i = 0; i < count; i++) {
      state.pouch.push(letter);
    }
  }
  fillLetters(state.p1.letters);
  fillLetters(state.p2.letters);
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
  if (state.board[boardIndex].letter) {
    showError("Nope!")
  }
  state.board[boardIndex] = { letter, finalized: false };
  render();
}

const VERTICAL = 0;
const HORIZONTAL = 1;

function findNewBoardWords() {
  let boardWords = [];
  let currentWord = "";
  let wordCells = [];
  let allFinalized = true;
  let start = {};

  function init(x, y) {
    currentWord = "";
    wordCells = [];
    allFinalized = true;
    start = { x, y };
  }

  function processCell(x, y, direction) {
    let boardIndex = y * HEIGHT + x;
    let { letter, finalized } = state.board[boardIndex];
    if (letter) {
      currentWord += letter;
      wordCells.push({letter, finalized, x, y})
      allFinalized &&= finalized;
    } else {
      if (currentWord.length >= 2 && !allFinalized) {
        const boardWord = {
          word: currentWord,
          wordCells: wordCells,
          start: start,
          end: { x, y },
        };
        // ensure the end indices are inclusive
        if (direction == VERTICAL) {
          boardWord.end.y -= 1;
        } else {
          boardWord.end.x -= 1;
        }
        boardWords.push(boardWord);
      }
      if (direction == VERTICAL) {
        init(x, y + 1);
      } else {
        init(x + 1, y);
      }
    }
  }

  iterateBoard(init, processCell);

  return boardWords;
}

// iterates over the board, first vertically, then horizontally.
// init is a function that runs at the start of each column or row, depending on
// direction.
// processCell runs for a single grid cell of the board, and is passed the x, y
// and direction values.
function iterateBoard(init, processCell) {
  // searching for words vertically
  for (let x = 0; x < WIDTH; x++) {
    init(x, 0);
    for (let y = 0; y < HEIGHT; y++) {
      processCell(x, y, VERTICAL);
    }
  }
  // searching for words horizontally
  for (let y = 0; y < HEIGHT; y++) {
    init(0, y);
    for (let x = 0; x < WIDTH; x++) {
      processCell(x, y, HORIZONTAL);
    }
  }
}

function validLetterPositions() {
  let isValid = true;
  let cols = new Set();
  let rows = new Set();
  let seenNewLetter, seenGapAfterNewLetter;
  function init() {
    seenNewLetter = false;
    seenGapAfterNewLetter = false;
  }
  // single straight line of unfinalized letters with no gaps
  function processCell(x, y) {
    let boardIndex = y * HEIGHT + x;
    let { letter, finalized } = state.board[boardIndex];
    if (letter && !finalized) {
      // if there's a new letter, then gap, then new letter, that's not allowed
      if (seenGapAfterNewLetter) {
        isValid = false;
      }
      cols.add(x);
      rows.add(y);
      seenNewLetter = true;
    } else if (!letter && seenNewLetter) {
      seenGapAfterNewLetter = true;
    }
  }

  iterateBoard(init, processCell);

  if (cols.size > 1 && rows.size > 1) {
    isValid = false;
  }

  // TODO at least one tile must be touching existing/finalised letters), or be on the middle index (for the first turn)

  return isValid;
}

/**
 * @returns state or null if none found
 */
async function getState(gameId) {
  const response = await fetch(
    `https://babble-s3uploadbucket-i308a30a9z9n.s3.us-east-2.amazonaws.com/${gameId}`
  );
  if (response.status >= 200 && response.status <= 299) {
    const newState = await response.json();
    return newState;
  } else if (response.status == 404 || response.status == 403) {
    return null;
  } else {
    throw new Error("Failure to get state: ", response);
  }
}

// save state to backend
async function persistState(currentState) {
  /* NOTE: This sequence check is racy but we don't expect it to be
   * common for a player to be submitting the same turn concurrently.
   * This just protects from overwriting newer state in case of a bug
   * or edge cases. There is nothing stopping a player from cheating
   * and just overwriting anything they want here!
   */
  const latestState = await getState(currentState.gameId);
  if (latestState && latestState.sequence !== currentState.sequence) {
    showError("Something wrong: state is stale");
    throw new Error("Stale state");
  }
  currentState.sequence++;

  const apiEndPoint =
    "https://qfhoof8bl7.execute-api.us-east-2.amazonaws.com/uploads";
  const uploadURLResponse = await fetch(
    `${apiEndPoint}?game_id=${currentState.gameId}`
  );

  const { uploadURL } = await uploadURLResponse.json();
  const uploadResponse = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentState),
  });

  if (uploadResponse.status < 200 && uploadResponse.status > 299) {
    throw new Error("Failure to get state: ", response);
  }
}

// loop and get state until it is current player's turn, then stop looping
function pollOtherPlayerTurn() {
  let intervalId;
  intervalId = setInterval(async () => {
    const newState = await getState(state.gameId);
    if (newState) {
      state = newState;
      if (currentPlayer().turn) {
        clearInterval(intervalId);
        render();
      }
    } else {
      console.warning(`Couldn't find state object for game ${state.gameId}`);
    }
  }, 1000);
}

async function finalizeTurn() {
  // validate position of letters (must be in straight line, all consecutive letters (no empty board space between)
  if (!validLetterPositions()) {
    showError("Letters must be in a straight line without gaps.");
    return;
  }

  const newBoardWords = findNewBoardWords();
  if (newBoardWords.length === 0) {
    showError("You must enter a valid word");
    return;
  }
  const undefinedWords = newBoardWords
    .map((bw) => bw.word)
    .filter((word) => !DICTIONARY.has(word));
  if (undefinedWords.length > 0) {
    showError(`Invalid scrabble word${ invalidWords.length > 0 ? 's' : '' }: ${invalidWords.join(", ")}`);
    return;
  }

  /**
   * We already validate that the letters are in a striaght line without gaps
   * previously. But in addition, at least one of the new board words must either:
   *
   *   1. Have a new (unfinalized) letter at the center
   *   2. Be touching a finalized letter (ie include a finalized letter within itself)
   *
   * */
  const validWordCells = newBoardWords
    .flatMap((bw) => bw.wordCells)
    .some((wc) => {
      const inCenter = wc.x == Math.floor(WIDTH / 2) && wc.y == Math.floor(HEIGHT / 2)
      return wc.finalized || inCenter
    })
  if (!validWordCells) {
    if (state.board.some((cell) => cell.finalized)) {
      // if not first turn
      showError("New words must be touching an existing word")
    } else {
      showError("Words must be in the center on the first turn")
    }
    return;
  }

  // TODO get board point modifiers
  // TODO blank letter points
  let points = 0;
  newBoardWords.forEach((boardWord) => {
    boardWord.word.split("").forEach((letter) => {
      points += LETTER_POINTS[letter];
    });
  });
  currentPlayer().score += points;

  // finalize all letters on board
  iterateBoard(
    () => {},
    (x, y) => {
      let boardIndex = y * HEIGHT + x;
      let { letter } = state.board[boardIndex];
      if (letter) {
        state.board[boardIndex].finalized = true;
      }
    }
  );

  // switch whose turn it is
  state.p1.turn = !state.p1.turn;
  state.p2.turn = !state.p2.turn;
  fillLetters(currentPlayer().letters);

  render();

  await persistState(state);

  // saves gameId to url so refresh works and can share game with other player
  window.history.pushState(
    { gameId: state.gameId },
    "",
    `?game_id=${state.gameId}`
  );

  // TODO if (turnsAvailable()) {
  pollOtherPlayerTurn();
  // TODO } else {
  // TODO finishGame();
  // TODO }
}

function render() {
  const boardEl = document.getElementById("babble-board");
  const letterDisplayEl = document.getElementById("letter-display");
  const turnSubmitEl = document.getElementById("turn-submit");
  const playerOneNameEl = document.getElementById("player-one-name");
  const playerOneScoreEl = document.getElementById("player-one-score");
  const playerTwoNameEl = document.getElementById("player-two-name");
  const playerTwoScoreEl = document.getElementById("player-two-score");

  playerOneNameEl.innerHTML = state.p1.name;
  playerOneScoreEl.innerHTML = state.p1.score;
  playerTwoNameEl.innerHTML = state.p2.name;
  playerTwoScoreEl.innerHTML = state.p2.score;

  turnSubmitEl.disabled = !currentPlayer().turn;
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
              .letters.map((l) => `<button class="piece">${l}</button>`)
              .join("\n")}
        </div>
    `;
}

let letterInHand = null;
document.addEventListener("click", function (event) {
  if (event.target.className === "piece") {
    // TODO make this proper selector? or use classname
    letterInHand = event.target.innerText;
  }

  if (event.target.id === "turn-submit") {
    finalizeTurn();
  }

  if (event.target.tagName === "TD") {
    const x = parseInt(event.target.attributes.x.value, 10);
    const y = parseInt(event.target.attributes.y.value, 10);
    placeLetter(x, y, letterInHand);
  }
  render();
  return false;
});

(async function () {
  // setup correct current state
  const params = new URL(document.location).searchParams;
  const gameId = params.get("game_id");
  if (gameId) {
    // game already exists, need to to load it
    state = await getState(gameId);
  } else {
    // new game
    startNewGame();
  }

  if (!currentPlayer().turn) {
    pollOtherPlayerTurn();
  }

  render();
})();
