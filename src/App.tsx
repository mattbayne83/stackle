import { useState } from 'react'
import type { Difficulty } from './types'
import { HomeScreen } from './screens/HomeScreen'
import { PlayScreen } from './screens/PlayScreen'

type Screen =
  | { name: 'home' }
  | { name: 'play'; playerId: string; difficulty: Difficulty }

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  // "Today's stack" — session-wide, resets on reload so free play stays the default.
  const [daily, setDaily] = useState(false)

  if (screen.name === 'play') {
    return (
      <PlayScreen
        playerId={screen.playerId}
        difficulty={screen.difficulty}
        daily={daily}
        onExit={() => setScreen({ name: 'home' })}
      />
    )
  }

  return (
    <HomeScreen
      daily={daily}
      onDailyChange={setDaily}
      onPlay={(playerId, difficulty) => setScreen({ name: 'play', playerId, difficulty })}
    />
  )
}

export default App
