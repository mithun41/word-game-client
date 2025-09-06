import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const socket = io("https://word-game-server-br59.onrender.com/");

export default function App() {
  const [player, setPlayer] = useState(null);
  const [room, setRoom] = useState({});
  const [roomId, setRoomId] = useState(null);
  const [word, setWord] = useState("");
  const [timer, setTimer] = useState(25);
  const [name, setName] = useState("");
  const [winner, setWinner] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    socket.on("update", (data) => setRoom({ ...data }));
    socket.on("game_ended", ({ room, winner }) => {
      setRoom(room);
      setWinner(winner);
      clearInterval(timerRef.current);
    });
    return () => {
      socket.off("update");
      socket.off("game_ended");
    };
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (room.turn && room.started) {
      setTimer(25); // 25 sec timer
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            socket.emit("submit_word", { roomId, player: room.turn, word: "" });
            return 25;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [room.turn, room.started]);

  const joinGame = (p) => {
    if (!name.trim()) return alert("Enter your name");
    socket.emit("join_game", { player: p, name }, (res) => {
      if (res.ok) {
        setPlayer(p);
        setRoomId(res.roomId);
      } else alert(res.message);
    });
  };

  const submitWord = () => {
    if (!word) return;
    socket.emit("submit_word", { roomId, player, word });
    setWord("");
  };

  const resetGame = () => {
    setWinner(null);
    socket.emit("reset_game", { roomId });
  };

  const startGame = () => socket.emit("start_game", { roomId });
  const endGame = () => socket.emit("end_game", { roomId });

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-r from-purple-400 to-indigo-600 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">🎮 Shiritori Multiplayer</h1>

      {/* Accordion Rules */}
      <div className="w-full max-w-3xl mb-6 bg-white/10 rounded-xl shadow-lg">
        <button
          onClick={() => setRulesOpen(!rulesOpen)}
          className="w-full text-left p-4 font-bold text-xl flex justify-between items-center hover:bg-white/20 transition rounded-t-xl"
        >
          Game Rules 📜
          <span
            className={`transform transition-transform ${
              rulesOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </button>
        {rulesOpen && (
          <ul className="p-4 list-disc list-inside space-y-1 text-white/90">
            <li>
              Each word must start with the last letter of the previous word.
            </li>
            <li>Minimum 4 letters per word.</li>
            <li>No word repetition allowed.</li>
            <li>Only valid English words are allowed.</li>
            <li>Incorrect word → lose 1 point.</li>
            <li>Player turn has 25 seconds timer.</li>
            <li>Click "End Game" to finish and see winner.</li>
          </ul>
        )}
      </div>

      {!player ? (
        <div className="space-y-4 w-full max-w-md">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg text-black outline-none border-2 border-white focus:ring-4 focus:ring-pink-400"
          />
          <div className="flex space-x-4">
            <button
              onClick={() => joinGame("player1")}
              className="flex-1 px-6 py-3 bg-pink-500 rounded-xl shadow-lg hover:bg-pink-600"
            >
              Join as Player 1
            </button>
            <button
              onClick={() => joinGame("player2")}
              className="flex-1 px-6 py-3 bg-yellow-500 rounded-xl shadow-lg hover:bg-yellow-600"
            >
              Join as Player 2
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl bg-white/10 p-6 rounded-2xl shadow-lg">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {["player1", "player2"].map((p) => (
              <div
                key={p}
                className={`p-4 rounded-xl transition ${
                  room.turn === p && room.started
                    ? "bg-green-600 ring-4 ring-green-300"
                    : p === "player1"
                    ? "bg-indigo-700"
                    : "bg-pink-700"
                }`}
              >
                <h2 className="text-lg font-semibold">
                  👤 {room.names?.[p] || p}
                </h2>
                <p>Score: {room.scores?.[p] || 0}</p>
                <p>{room.players?.[p] ? "✅ Joined" : "⏳ Waiting..."}</p>
              </div>
            ))}
          </div>

          {!room.started && room.players?.player1 && room.players?.player2 && (
            <button
              onClick={startGame}
              className="px-6 py-3 bg-green-500 rounded-xl shadow-lg hover:bg-green-600 w-full"
            >
              ▶️ Start Game
            </button>
          )}

          {room.started && !winner && (
            <>
              <div className="text-center mb-4">
                <p className="text-xl font-bold">
                  Turn:{" "}
                  {room.turn === "player1"
                    ? room.names?.player1
                    : room.names?.player2}
                </p>
                <p className="text-lg">⏳ Time left: {timer}s</p>
              </div>

              {player === room.turn && (
                <div className="flex space-x-2 mb-4">
                  <input
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg text-black outline-none border-2 border-white focus:ring-4 focus:ring-blue-400"
                    placeholder="Type a word..."
                  />
                  <button
                    onClick={submitWord}
                    className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600"
                  >
                    Submit
                  </button>
                </div>
              )}

              <div className="bg-black/30 p-3 rounded-lg mb-4">
                <h3 className="font-semibold mb-2">Word History:</h3>
                <div className="flex flex-wrap gap-2">
                  {room.wordHistory?.map((w, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-white/20 rounded-full text-sm"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={endGame}
                  className="flex-1 px-6 py-2 bg-red-500 rounded-lg hover:bg-red-600"
                >
                  🏁 End Game
                </button>
                <button
                  onClick={resetGame}
                  className="flex-1 px-6 py-2 bg-gray-500 rounded-lg hover:bg-gray-600"
                >
                  🔄 Reset Game
                </button>
              </div>
            </>
          )}

          {winner && (
            <div className="text-center mt-6 p-4 bg-green-500 rounded-xl text-white font-bold text-2xl">
              🎉 Congratulations {winner}! You won! 🎉
            </div>
          )}
        </div>
      )}
    </div>
  );
}
