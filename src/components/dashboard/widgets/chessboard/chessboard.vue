<template>
  <div class="chessboard-container">
    <div ref="board" class="board board-background">
      <div class="square"
          v-for="(square, squareIndex) in board"
          :style="squareStyle"
          :key="square.id"
          :class="{
            'board-square-dark': !chessGame.isSquareLight(squareIndex),
            'board-square-light': chessGame.isSquareLight(squareIndex),
            'highlighted-red': isAvailableMove(squareIndex) && square.piece,
            'highlighted-yellow': (selectedIndex === squareIndex)
            }">
        <i  class="circle" v-if="isAvailableMove(squareIndex) && !square.piece"/>
      </div>
    </div>
    <transition-group name="board-squares" tag="div" class="board">
      <div class="square"
            v-on:dragover="dragOver(squareIndex)"
            v-for="(square, squareIndex) in board"
            :key="square.id"
            :style="squareStyle"
            v-on:click="squareSelected(squareIndex)">
          <img
            draggable="true"
            v-on:dragstart="drag(squareIndex)"
            v-if="square.piece"
            class="piece"
            :src="require(`./chess-pieces/wikipedia/${square.piece.color}${square.piece.type}.png`)">
      </div>
    </transition-group>
  </div>
</template>

<script>
import ChessGame from './utils/chessgame'
export default {
  name: 'chessboard',
  props: {
    fen: { // FEN
      type: String,
      default: null
    },
    side: { // Side is either 'w' or 'b', and determines which board orientation to display
      type: String,
      default: 'w'
    },
    iconDir: {
      type: String,
      default: 'static/icons/'
    }
  },
  data () {
    return {
      chessGame: null, // the game logic class
      availableMoves: {}, // key/value obj of available moves
      selectedIndex: -1, // the currently selected square index
      squareStyle: { // Square style - values will be reset whenever window is resized
        height: '40px',
        width: '40px'
      }
    }
  },
  computed: {
    /** Return the board array to be displayed.  Board is an array of squares, some with pieces */
    board () {
      return this.chessGame.getBoard()
    },
    /** Return 'w' or 'b' if it is white or black's turn respectively */
    turn () {
      return this.chessGame.getTurn()
    }
  },
  watch: {
    /** Watch the FEN property so that the game can receive new moves from outside the component */
    'fen': function (newVal, oldVal) {
      this.syncToFen(newVal)
    },

    /** Watch the side property so that the UI reflects side-swaps */
    'side': function (newVal, oldVal) {
      // Set the board orientation whenever the side changes
      // console.log(`side: ${this.colorside}`)
      this.chessGame.setSide(newVal)
      this.selectedIndex = -1
      this.availableMoves = {}
    }
  },
  created () {
    // Initialize a new game for the provided fen and side properties
    this.chessGame = new ChessGame(this.fen, this.side)
    // console.log(`chessGame: ${JSON.stringify(chessGame)}`)
  },
  mounted () {
    // On mounted,set the square width and hight
    this.$nextTick(() => {
      // Reset sqaure size every time window resizes
      window.addEventListener('resize', this.getSquareStyle)
      this.getSquareStyle()
    })
  },
  methods: {
    /** Set the square width/height to 1/8 of the total board width */
    getSquareStyle (event) {
      const board = this.$refs.board
      if (board) {
        // Subtract 1 from total width to avoid pixel-wrapping edge-case
        let squareEdgeLength = (board.offsetWidth - 1) / 8

        this.squareStyle = {
          height: `${squareEdgeLength}px`,
          width: `${squareEdgeLength}px`
        }
      }
    },

    // /** Apply a new move to the board */
    // applyNewMove (newMove) {
    //   const srcIndex = this.chessGame.getIndexForPositionString(newMove.from)
    //   const targetIndex = this.chessGame.getIndexForPositionString(newMove.to)
    //   this.movePiece(srcIndex, targetIndex)
    // },

    /** Check if a square index is an available move */
    isAvailableMove (index) {
      return (this.availableMoves[index] === true)
    },

    syncToFen (newFen) {
      this.selectedIndex = -1;
      this.availableMoves = {};
      if(this.chessGame.getFEN() != newFen) {
        this.chessGame = new ChessGame(newFen, this.side);
      }
    },

    /** Get the icon for the piece */
    getIcon (square) {
      if (square.piece) {
        return require(this.iconDir + `${square.piece.color}${square.piece.type}.svg`)
      }
    },

    /** Reset the board to original position */
    reset () {
      this.chessGame.reset()
      this.syncBoard()
    },

    /** Animate piece from one index to another */
    swap (oldIndex = 0, newIndex = 0) {
      const temp = this.board[newIndex]
      this.$set(this.board, newIndex, this.board[oldIndex])
      this.$set(this.board, oldIndex, temp)
    },

    /** Move a piece to the target index, if move is valid */
    movePiece (source, target) {
      const result = this.chessGame.calculateMove(source, target)

      // console.log(`movePiece result: ${result}`);
      // if result is undefined, move is invalid
      if (result) {
        this.swap(target, source) // Swap the contents of the squares
        this.syncBoard() // Sync the piece position with the board model
        this.availableMoves = {} // Reset available moves
        this.selectedIndex = -1 // Reset index

        // Emit the move to any parent components
        setTimeout(() => this.$emit('change', this.chessGame.getFEN()), 200)
      } else {
        this.selectedIndex = -1
        this.squareSelected(target)
      }
    },

    /** Sync the displayed board with the chessgame object. */
    syncBoard () {
      /**
       *  Why not just use "this.board = this.chessGame.getBoard()"? It has to do with
       *  how Vuejs handles reactivity within arrays.  Long-story-short, in order to sync
       *  any side-effects from the move, such as castles, promotions, and captures, it is best
       *  for our purposes to manually assign the changed pieces within the array item.
      */
      const updatedBoard = this.chessGame.getBoard()
      for (let i = 0; i < updatedBoard.length; i++) {
        if (this.board[i].piece !== updatedBoard[i].piece) {
          this.board[i].piece = updatedBoard[i].piece
        }
      }
    },

    /** Display all available moves for the selected piece */
    displayAvailableMoves () {
      const moves = this.chessGame.getAvailableMoves(this.selectedIndex)

      if (moves.length < 1) {
        // If no available moves, de-select the square
        this.selectedIndex = -1
      } else {
        // Set each move to true in the available moves dict
        for (let move of moves) {
          // Use $set for the changes to display instantly in the UI
          this.$set(this.availableMoves, move, true)
        }
      }
    },

    drag (index) {
      this.squareSelected(index)
    },

    dragOver (index) {
      console.log(index)
    },

    /** On-click for square, select square or try move if suqare is selected  */
    squareSelected (index) {
      // console.log(`squareSelected index: ${index}`);
      if (this.isActive()) {
        this.availableMoves = {}
        if (this.selectedIndex === index) {
          this.selectedIndex = -1
        } else if (this.selectedIndex > 0) {
          // console.log(`moving to: ${index}`);
          this.movePiece(this.selectedIndex, index)
        } else {
          // console.log(`selecting ${index}`);
          this.selectedIndex = index
          this.displayAvailableMoves()
        }
      }
    },
    isActive () {
      // console.log(`${this.side} - ${this.chessGame.getTurn()}`);
      return (this.side == this.chessGame.getTurn());
    }
  }
}
</script>

<style scoped lang="scss">

.board-square-light {
  background: #A77C51;
}

.board-square-dark {
  background: #602B16;
}

.highlighted-yellow {
  background: rgba(234, 136, 37, 1);
}

.highlighted-green {
  background: rgba(65, 240, 65, 0.2);
}

.highlighted-blue {
  background: rgba(65, 65, 240, 0.5);
}

.highlighted-red {
  background: rgba(180, 0, 0, 1);
}

.circle {
  border-radius: 50%;
  width: 30%;
  height: 30%;
  background: rgba(234, 136, 37, 1);
}

.chessboard-container {
  color: white;
  flex-direction: row;
  flex-grow: 1;
  flex-shrink: 0;
  position: relative;
  margin: 0 auto;
}

.board-squares-move {
  transition: transform .3s;
}

.board-background {
  position: absolute;
  z-index: 1;
}

.board {
  display: flex;
  margin: 0 auto;
  flex-direction: row;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.piece {
  position: sticky;
  z-index: 1;
  max-width: 80%;
  cursor: grab;
}

.mainpiece {
  padding-bottom: 5px;
}

.square {
  position: sticky;
  z-index: 1;
  flex-grow: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
}

</style>
