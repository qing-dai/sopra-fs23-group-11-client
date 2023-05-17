import React, { useContext, useEffect, useState, useRef } from "react"
import BattleshipBoard from "../components/BattleShipBoard.jsx"
import Ship from "../components/Ship.jsx"
import { api } from "../helpers/api.js"
import AnimationContainer from "../components/AnimationContainer.jsx"
import EnemyExitModal from "../components/EnemyExitModal.jsx"

import {
  Flex,
  Button,
  Box,
  Text,
  Spinner,
  Grid,
  GridItem,
  Switch,
  FormLabel,
  useToast,
} from "@chakra-ui/react"
import { GameContext } from "../contexts/GameContext.jsx"
import { Stomp } from "stompjs/lib/stomp"
import { getDomainWebsocket } from "../helpers/getDomainWebsocket.js"

import { Alert, AlertIcon, Stack } from "@chakra-ui/react"

import { useParams, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

const shipsVariant = {
  hidden: {
    opacity: 0,
    x: "100vw",
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", delay: 0.7, stiffness: 50 },
  },
}

const boardVariant = {
  hidden: {
    opacity: 0,
    x: "-100vw",
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", delay: 0.4, stiffness: 50 },
  },
}

const readyVariants = {
  hidden: {
    y: "-100vh",
  },
  visible: {
    y: 0,
    transition: { stiffness: 120, type: "spring" },
  },
}
let socket = null
function Setup() {
  const {
    user,
    player,
    setPlayer,
    lobby,
    direction,
    setDirection,
    errorLogs,
    handleSelect,
    handlePlace,
    setEnemy,
    enemy,
    resetState,
  } = useContext(GameContext)

  const [isStartSetup, setIsStartSetup] = useState(false)
  const [waitingSpinner, setWaitingSpinner] = useState(false)
  const [enemyExit, setEnemyExit] = useState(false)
  const { lobbyCode } = useParams()
  const navigate = useNavigate()
  const hostId = lobby.hostId

  useEffect(() => {
    console.log("effect ran...")
    socket = Stomp.client(getDomainWebsocket())
    socket.connect({}, onConnected, errorCallback)

    if (player.isReady && enemy.isReady) navigate(`/game/${lobbyCode}`)
  }, [enemy.isReady, player.isReady])


  const errorCallback = (m) => {
    console.log("mmm", m)
  }

  const onConnected = () => {
    console.log("Stomp client connected !", lobbyCode)
    socket.subscribe(`/startgame/${lobbyCode}`, onStartGame)
    console.log("websocket connected!")
    socket.subscribe(
      `/ready/${user.id === lobby.hostId ? lobby.joinerName : lobby.hostName}`,
      onReady
    )
    socket.subscribe(`/game/${lobbyCode}/leave`, onLeave)
  }

  async function startGame() {
    try {
      await api.post(`/startgame`, JSON.stringify({ lobbyCode, hostId }))
    } catch (error) {
      console.log(error.message)
    }
  }

  function playerReady() {
    setPlayer((player) => ({ ...player, isReady: true }))

    const readyMessage = {
      gameId: lobbyCode,
      playerId: player.id,
      playerName: player.name,
      playerBoard: JSON.stringify(player.board),
    }
    setWaitingSpinner(true)
    socket.send(`/app/ready`, {}, JSON.stringify(readyMessage))
  }

  const onStartGame = (payload) => {
    console.log("game starts")
    const payloadData = JSON.parse(payload.body)
    console.log("game starts")
    if (user.isHost) {
      setPlayer((player) => ({
        ...player,
        id: payloadData.player1Id,
        name: payloadData.player1Name,
        isMyTurn: true,
      }))

      setEnemy((enemy) => ({
        ...enemy,
        id: payloadData.player2Id,
        name: payloadData.player2Name,
      }))
    } else {
      setPlayer((player) => ({
        ...player,
        id: payloadData.player2Id,
        name: payloadData.player2Name,
      }))
      setEnemy((enemy) => ({
        ...enemy,
        id: payloadData.player1Id,
        name: payloadData.player1Name,
      }))
    }

    setIsStartSetup(true)
  }

  const onReady = (payload) => {
    console.log("game starts on Ready")
    const payloadData = JSON.parse(payload.body)
    setEnemy((enemy) => ({
      ...enemy,
      isReady: true,
      board: JSON.parse(payloadData.playerBoard),
    }))
  }

  const onLeave = () => {
    console.log("player left the game")
    setEnemyExit(true)
  }

  //the following functions delegate to the functions from GameContext
  const selectShip = (shipId) => {
    handleSelect(shipId)
  }

  const placeShip = (rowIndex, colIndex) => {
    handlePlace(rowIndex, colIndex)
  }

  const handleToggle = () => {
    setDirection(direction === "Horizontal" ? "Vertical" : "Horizontal")
  }

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" h="70vh">
      {isStartSetup ? (
        <Flex justifyContent="center" alignItems="center">
          <AnimationContainer variants={boardVariant}>
            <BattleshipBoard
              board={player.board}
              handlePlace={placeShip}
              isSetUp={true}
              direction={direction}
            />
          </AnimationContainer>
          <Flex direction="column" minW="300px" justifyContent="center">
            <AnimationContainer variants={shipsVariant}>
              {player.ships.length !== 0 && (
                <h2 style={{ fontSize: "20px", marginBottom: "20px" }}>
                  Place your ships
                </h2>
              )}
              <Flex direction="column" minH="400px">
                {player.ships.map((ship) => (
                  <Ship
                    key={ship.id}
                    type={ship.type}
                    length={ship.length}
                    isHeld={ship.isHeld}
                    handleSelect={selectShip}
                    playerId={player.id}
                    shipId={ship.id}
                  />
                ))}
                {player.ships.length !== 0 && (
                  <>
                    <FormLabel fontSize="20px" htmlFor="direction">
                      {direction}
                    </FormLabel>
                    <Switch id="direction" mb={10} onChange={handleToggle} />
                  </>
                )}
              </Flex>
            </AnimationContainer>

            {player.ships.length === 0 && (
              <AnimationContainer variants={readyVariants}>
                <Button
                  onClick={playerReady}
                  isLoading={waitingSpinner}
                  spinnerPlacement="start"
                  loadingText="Good Luck Captain 🫡"
                  alignSelf="center"
                >
                  Ready
                </Button>
              </AnimationContainer>
            )}
          </Flex>
        </Flex>
      ) : user.isHost ? (
        <Button onClick={startGame} alignSelf="center" size="lg">
          Start Setup
        </Button>
      ) : (
        <Flex
          justifyContent="center"
          alignItems="center"
          h="70vh"
          direction={"column"}
        >
          <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.200"
            color="blue.500"
            size="lg"
          />
          <Text textAlign={"center"}>
            Please Wait, Host is putting on his socks...
          </Text>
        </Flex>
      )}
      {enemyExit && <EnemyExitModal enemyExit={enemyExit}/>}
    </Box>
  )
}
export default Setup
