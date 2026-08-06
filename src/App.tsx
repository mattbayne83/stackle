import { useState } from 'react'
import type { Difficulty } from './types'
import { HomeScreen } from './screens/HomeScreen'
import { PlayScreen } from './screens/PlayScreen'

type Screen =
  | { name: 'home' }
  | { name: 'play'; playerId: string; difficulty: Difficulty }

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  if (screen.name === 'play') {
    return (
      <PlayScreen
        playerId={screen.playerId}
        difficulty={screen.difficulty}
        onExit={() => setScreen({ name: 'home' })}
      />
    )
  }

  return (
    <HomeScreen
      onPlay={(playerId, difficulty) => setScreen({ name: 'play', playerId, difficulty })}
    />
  )
}

export default App
