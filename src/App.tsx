import React, { useState, useEffect } from 'react';
import { Button } from './components/ui/button.tsx';
import { Card } from './components/ui/card.tsx';

type Position = {
  x: number;
  y: number;
};

type Region = 'south' | 'central' | 'north';
type Resource = 'wood' | 'food' | 'textile' | 'metal';
type Vehicle = 'raft' | 'ferry' | 'steamboat';

interface GameState {
  currentRegion: Region;
  playerPos: Position;
  inventory: {
    resources: Record<Resource, number>;
    money: number;
  };
  vehicles: {
    type: Vehicle;
    unlocked: boolean;
  }[];
  regionProgress: Record<Region, number>;
  hasRaft: boolean;
  isOnRaft: boolean;
  isOnSteamboat: boolean;
  ferryLocations: Record<Region, Set<number>>;
  steamboatPos: Record<Region, Position | null>;
  cargo: string[];
}

const RiverTradingGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentRegion: 'south',
    playerPos: { x: 4, y: 5 },
    inventory: {
      resources: {
        wood: 0,
        food: 0,
        textile: 0,
        metal: 0
      },
      money: 10
    },
    vehicles: [
      { type: 'raft', unlocked: false },
      { type: 'ferry', unlocked: false },
      { type: 'steamboat', unlocked: false }
    ],
    regionProgress: {
      south: 0,
      central: 0,
      north: 0
    },
    hasRaft: false,
    isOnRaft: false,
    isOnSteamboat: false,
    ferryLocations: {
      south: new Set<number>(),
      central: new Set<number>(),
      north: new Set<number>()
    },
    steamboatPos: {
      south: null,
      central: null,
      north: null
    },
    cargo: []
  });

  const [nearDock, setNearDock] = useState(false);
  const [nearTree, setNearTree] = useState(false);
  const [nearNPC, setNearNPC] = useState<'west' | 'east' | null>(null);

  // Map Legend:
  // 0 = land
  // 1 = water/river
  // 2 = dock
  // 3 = trees
  // 4 = rocks/mine
  // 5 = west trader (basic)
  // 6 = east trader (basic)
  // 7 = textile mill
  // 8 = merchant
  // 9 = factory

  // South region map: Basic resources, simple trade routes
  const southMap = [
    [0,0,3,0,2,1,1,1,2,0,3],
    [0,3,0,5,0,1,1,1,0,0,0],
    [3,0,0,0,0,1,1,1,0,6,0],
    [0,3,0,0,0,1,1,1,0,0,3],
    [0,0,5,0,2,1,1,1,2,0,0],
    [0,3,0,0,0,1,1,1,0,0,0],
    [3,0,0,0,0,1,1,1,0,0,0],
    [0,0,3,0,0,1,1,1,0,0,3],
    [0,3,5,0,2,1,1,1,2,6,0],
    [3,0,0,0,0,1,1,1,0,0,0]
  ];

  // Central region map: Industry and textile focus
  const centralMap = [
    [0,0,3,0,2,1,1,1,2,0,3],
    [0,7,0,5,0,1,1,1,0,6,0],
    [3,0,0,0,0,1,1,1,0,8,0],
    [0,3,0,0,2,1,1,1,2,0,3],
    [0,7,0,5,0,1,1,1,0,6,0],
    [3,0,0,0,0,1,1,1,0,8,0],
    [0,7,0,5,0,1,1,1,0,6,0],
    [3,0,0,0,2,1,1,1,2,0,3],
    [0,0,3,0,0,1,1,1,0,8,0],
    [0,3,0,0,0,1,1,1,0,0,0]
  ];

  // North region map: Mining and industrial focus
  const northMap = [
    [0,0,4,0,2,1,1,1,2,0,4],
    [0,4,0,9,0,1,1,1,0,9,0],
    [4,0,0,0,0,1,1,1,0,0,0],
    [0,4,0,0,2,1,1,1,2,9,4],
    [0,9,0,4,0,1,1,1,0,0,0],
    [4,0,0,0,0,1,1,1,0,9,0],
    [0,4,0,9,0,1,1,1,0,0,4],
    [4,0,0,0,2,1,1,1,2,9,0],
    [0,0,4,0,0,1,1,1,0,0,0],
    [0,4,0,0,0,1,1,1,0,9,4]
  ];

  const getRegionMap = (region: Region) => {
    switch(region) {
      case 'south':
        return southMap;
      case 'central':
        return centralMap;
      case 'north':
        return northMap;
      default:
        return southMap;
    }
  };

  const resetPosition = () => {
    const newX = gameState.playerPos.x < 6 ? 4 : 8;
    setGameState(prev => ({
      ...prev,
      playerPos: { x: newX, y: prev.playerPos.y },
      isOnRaft: false,
      hasRaft: false
    }));
  };

  const movePlayer = (dx: number, dy: number) => {
    const currentMap = getRegionMap(gameState.currentRegion);
    const newX = gameState.playerPos.x + dx;
    const newY = gameState.playerPos.y + dy;
    
    if (newX < 0 || newX >= currentMap[0].length || newY < 0 || newY >= currentMap.length) return;
    
    const terrain = currentMap[newY][newX];
    
    // Block water movement unless on appropriate transport
    if (terrain === 1 && !gameState.isOnRaft && !gameState.isOnSteamboat) return;
    if (terrain !== 1 && (gameState.isOnRaft || gameState.isOnSteamboat)) return;
    
    // Handle raft movement with current
    if (gameState.isOnRaft && terrain === 1) {
      const isGoingEast = dx > 0;
      const isGoingWest = dx < 0;
      const currentRow = gameState.playerPos.y;
      const atFerryLocation = gameState.ferryLocations[gameState.currentRegion].has(currentRow);
      
      if ((isGoingEast || isGoingWest) && !atFerryLocation) {
        if (newY >= currentMap.length - 1) {
          resetPosition();
          return;
        }
        setGameState(prev => ({
          ...prev,
          playerPos: { x: newX, y: newY + 1 }
        }));
        return;
      }
    }

    // Move player and steamboat together if aboard
    if (gameState.isOnSteamboat) {
      setGameState(prev => ({
        ...prev,
        playerPos: { x: newX, y: newY },
        steamboatPos: {
          ...prev.steamboatPos,
          [prev.currentRegion]: { x: newX, y: newY }
        }
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        playerPos: { x: newX, y: newY }
      }));
    }
  };

  const isNearDockAtRow = (y: number) => {
    const currentMap = getRegionMap(gameState.currentRegion);
    for (let x = 0; x < currentMap[0].length; x++) {
      if (currentMap[y][x] === 2) {
        if (Math.abs(gameState.playerPos.y - y) <= 1 && Math.abs(gameState.playerPos.x - x) <= 1) {
          return true;
        }
      }
    }
    return false;
  };

  useEffect(() => {
    const currentMap = getRegionMap(gameState.currentRegion);
    let isNearDock = false;
    let isNearTree = false;
    let traderType: 'west' | 'east' | null = null;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = gameState.playerPos.x + dx;
        const checkY = gameState.playerPos.y + dy;
        if (checkX >= 0 && checkX < currentMap[0].length && checkY >= 0 && checkY < currentMap.length) {
          if (currentMap[checkY][checkX] === 2) isNearDock = true;
          if (currentMap[checkY][checkX] === 3) isNearTree = true;
          if (currentMap[checkY][checkX] === 5) traderType = 'west';
          if (currentMap[checkY][checkX] === 6) traderType = 'east';
        }
      }
    }
    setNearDock(isNearDock);
    setNearTree(isNearTree);
    setNearNPC(traderType);
  }, [gameState.playerPos, gameState.currentRegion]);

  const chopTree = () => {
    const currentMap = getRegionMap(gameState.currentRegion);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = gameState.playerPos.x + dx;
        const checkY = gameState.playerPos.y + dy;
        if (checkX >= 0 && checkX < currentMap[0].length && 
            checkY >= 0 && checkY < currentMap.length &&
            currentMap[checkY][checkX] === 3) {
          setGameState(prev => ({
            ...prev,
            inventory: {
              ...prev.inventory,
              resources: {
                ...prev.inventory.resources,
                wood: prev.inventory.resources.wood + 1
              }
            }
          }));
          return;
        }
      }
    }
  };

  const buildRaft = () => {
    if (gameState.inventory.resources.wood >= 3 && nearDock && !gameState.hasRaft) {
      setGameState(prev => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          resources: {
            ...prev.inventory.resources,
            wood: prev.inventory.resources.wood - 3
          }
        },
        hasRaft: true
      }));
    }
  };

  const buildSteamboat = () => {
    const successfulTrades = gameState.regionProgress.south;
    
    if (gameState.inventory.resources.wood >= 20 && 
        gameState.inventory.money >= 50 && 
        nearDock && 
        successfulTrades >= 20) {
      // Place steamboat at the current dock
      let steamboatX = 0;
      let steamboatY = gameState.playerPos.y;
      
      // Find the nearest dock's x position
      const map = getRegionMap(gameState.currentRegion);
      for (let x = 0; x < map[0].length; x++) {
        if (map[steamboatY][x] === 2 && Math.abs(x - gameState.playerPos.x) <= 1) {
          steamboatX = x;
          break;
        }
      }

      setGameState(prev => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          resources: {
            ...prev.inventory.resources,
            wood: prev.inventory.resources.wood - 20
          },
          money: prev.inventory.money - 50
        },
        vehicles: prev.vehicles.map(v =>
          v.type === 'steamboat' ? { ...v, unlocked: true } : v
        ),
        steamboatPos: {
          ...prev.steamboatPos,
          [prev.currentRegion]: { x: steamboatX, y: steamboatY }
        }
      }));
    }
  };

  const buildFerry = () => {
    if (gameState.inventory.resources.wood >= 10 && gameState.inventory.money >= 24) {
      if (isNearDockAtRow(1) && !gameState.ferryLocations[gameState.currentRegion].has(1)) {
        setGameState(prev => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            resources: {
              ...prev.inventory.resources,
              wood: prev.inventory.resources.wood - 10
            },
            money: prev.inventory.money - 24
          },
          ferryLocations: {
            ...prev.ferryLocations,
            [prev.currentRegion]: new Set([...prev.ferryLocations[prev.currentRegion], 1])
          }
        }));
      } else if (isNearDockAtRow(8) && !gameState.ferryLocations[gameState.currentRegion].has(8)) {
        setGameState(prev => ({
          ...prev,
          inventory: {
            ...prev.inventory,
            resources: {
              ...prev.inventory.resources,
              wood: prev.inventory.resources.wood - 10
            },
            money: prev.inventory.money - 24
          },
          ferryLocations: {
            ...prev.ferryLocations,
            [prev.currentRegion]: new Set([...prev.ferryLocations[prev.currentRegion], 8])
          }
        }));
      }
    }
  };

  const toggleRaft = () => {
    if (gameState.hasRaft && !gameState.isOnSteamboat) {
      if (gameState.isOnRaft) {
        setGameState(prev => ({
          ...prev,
          isOnRaft: false
        }));
      } else if (nearDock) {
        setGameState(prev => ({
          ...prev,
          isOnRaft: true
        }));
      }
    }
  };

  const toggleSteamboat = () => {
    const steamboat = gameState.steamboatPos[gameState.currentRegion];
    const isNearSteamboat = steamboat && 
      Math.abs(gameState.playerPos.x - steamboat.x) <= 1 && 
      Math.abs(gameState.playerPos.y - steamboat.y) <= 1;

    if (gameState.vehicles.find(v => v.type === 'steamboat')?.unlocked) {
      if (gameState.isOnSteamboat && nearDock) {
        // Exit steamboat at dock
        setGameState(prev => ({
          ...prev,
          isOnSteamboat: false
        }));
      } else if (!gameState.isOnSteamboat && nearDock && isNearSteamboat) {
        // Board steamboat at dock
        setGameState(prev => ({
          ...prev,
          isOnSteamboat: true,
          playerPos: steamboat
        }));
      }
    }
  };

  const buyItem = (item: string) => {
    if (gameState.inventory.money >= 5 && gameState.cargo.length < 3) {
      setGameState(prev => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          money: prev.inventory.money - 5
        },
        cargo: [...prev.cargo, item]
      }));
    }
  };

  const sellItem = (item: string) => {
    const itemIndex = gameState.cargo.indexOf(item);
    if (itemIndex !== -1) {
      setGameState(prev => ({
        ...prev,
        cargo: prev.cargo.filter((_, i) => i !== itemIndex),
        inventory: {
          ...prev.inventory,
          money: prev.inventory.money + 7
        },
        regionProgress: {
          ...prev.regionProgress,
          south: prev.regionProgress.south + 1
        }
      }));
    }
  };

  const getProgressDisplay = () => {
    const trades = gameState.regionProgress.south;
    if (gameState.vehicles.find(v => v.type === 'steamboat')?.unlocked) {
      return 'Steamboat Unlocked!';
    }
    return `Trade Progress: ${trades}/20 trades`;
  };

  const FerryLine = () => {
    const cellSize = 49;
    
    return (
      <div className="absolute left-0 right-0 top-0 pointer-events-none">
        {/* Top ferry line (y=1) */}
        {gameState.ferryLocations[gameState.currentRegion].has(1) && (
          <div key="bottomFerry" className="relative">
            <div 
              className="absolute h-0.5 bg-black"
              style={{
                top: `${8.5 * cellSize + cellSize/2}px`,
                left: `${5.7 * cellSize + cellSize/2}px`,
                width: `${(9 - 1) * cellSize}px`,
              }}
            />
          </div>
        )}
        {/* Bottom ferry line (y=8) */}
        {gameState.ferryLocations[gameState.currentRegion].has(8) && (
          <div key="topFerry" className="relative">
            <div 
              className="absolute h-0.5 bg-black"
              style={{
                top: `${8.5 * cellSize + cellSize/2}px`,
                left: `${5.7 * cellSize + cellSize/2}px`,
                width: `${(9 - 1) * cellSize}px`,
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const RegionNavigation = () => {
    const canTravelNorth = gameState.vehicles.find(v => v.type === 'steamboat')?.unlocked;
    
    return (
      <Card className="fixed top-4 right-4 p-4">
        <h3 className="font-bold mb-2">Travel</h3>
        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => setGameState(prev => ({...prev, currentRegion: 'south'}))}
            disabled={gameState.currentRegion === 'south'}
          >
            South Region
          </Button>
          <Button 
            onClick={() => setGameState(prev => ({...prev, currentRegion: 'central'}))}
            disabled={!canTravelNorth || gameState.currentRegion === 'central'}
          >
            Central Region
          </Button>
          <Button 
            onClick={() => setGameState(prev => ({...prev, currentRegion: 'north'}))}
            disabled={!canTravelNorth || gameState.currentRegion === 'north'}
          >
            North Region
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="w-full max-w-4xl p-4 pb-32 relative min-h-screen bg-white">
      <div className="mb-4">
        <div>Wood: {gameState.inventory.resources.wood} | Money: ${gameState.inventory.money}</div>
        <div>Status: {gameState.isOnSteamboat ? 'On Steamboat' : gameState.isOnRaft ? 'On Raft' : 'On Foot'}</div>
        <div>Cargo ({gameState.cargo.length}/3): {gameState.cargo.join(', ')}</div>
        <div className="text-blue-600 font-bold">{getProgressDisplay()}</div>
      </div>

      {nearNPC === 'west' && (
        <Card className="mb-4 p-4">
          <h3 className="font-bold mb-2">West Bank Farmer</h3>
          <p className="mb-2">"I grow corn, but I need textiles from the east bank!"</p>
          <div className="flex gap-2">
            <Button onClick={() => buyItem('corn')} disabled={gameState.inventory.money < 5 || gameState.cargo.length >= 3}>
              Buy Corn ($5)
            </Button>
            <Button onClick={() => sellItem('textile')} disabled={!gameState.cargo.includes('textile')}>
              Sell Textile ($7)
            </Button>
          </div>
        </Card>
      )}

      {nearNPC === 'east' && (
        <Card className="mb-4 p-4">
          <h3 className="font-bold mb-2">East Bank Weaver</h3>
          <p className="mb-2">"I make textiles, but I need corn from the west bank!"</p>
          <div className="flex gap-2">
            <Button onClick={() => buyItem('textile')} disabled={gameState.inventory.money < 5 || gameState.cargo.length >= 3}>
              Buy Textile ($5)
            </Button>
            <Button onClick={() => sellItem('corn')} disabled={!gameState.cargo.includes('corn')}>
              Sell Corn ($7)
            </Button>
          </div>
        </Card>
      )}
      
      <div className="relative">
        <div className="grid grid-cols-11 gap-1">
          {getRegionMap(gameState.currentRegion).map((row, y) => (
            row.map((cell, x) => (
              <div 
                key={`${x}-${y}`} 
                className={`w-12 h-12 flex items-center justify-center
                  ${cell === 0 ? 'bg-green-200' : ''} 
                  ${cell === 1 ? 'bg-blue-300' : ''}
                  ${cell === 2 ? 'bg-yellow-600' : ''}
                  ${cell === 3 ? 'bg-green-800' : ''}
                  ${cell === 5 ? 'bg-purple-300' : ''}
                  ${cell === 6 ? 'bg-pink-300' : ''}
                  ${cell === 7 ? 'bg-indigo-300' : ''}
                  ${cell === 8 ? 'bg-yellow-300' : ''}
                  ${cell === 9 ? 'bg-red-300' : ''}
                  ${cell === 4 ? 'bg-gray-600' : ''}
                  ${gameState.playerPos.x === x && gameState.playerPos.y === y ? 'ring-2 ring-red-500' : ''}
                `}
              >
                {gameState.playerPos.x === x && gameState.playerPos.y === y ? '👤' : ''}
                {cell === 1 && '↓'}
                {cell === 5 && '🧑'}
                {cell === 6 && '👘'}
                {gameState.steamboatPos[gameState.currentRegion]?.x === x && 
                 gameState.steamboatPos[gameState.currentRegion]?.y === y && '🚢'}
              </div>
            ))
          ))}
        </div>
        <FerryLine />
      </div>

      <RegionNavigation />

      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex flex-col items-center gap-4">
          {/* Action Buttons */}
          <div className="flex gap-2 mb-2 bg-slate-200 p-2 rounded-lg">
            {nearTree && (
              <Button onClick={chopTree} className="w-24 bg-white hover:bg-gray-100">
                Chop Tree
              </Button>
            )}
            {nearDock && (
              <Button 
                onClick={buildRaft} 
                disabled={gameState.inventory.resources.wood < 3 || gameState.hasRaft}
                className="w-24 bg-white hover:bg-gray-100"
              >
                Build Raft
              </Button>
            )}
            {(isNearDockAtRow(1) || isNearDockAtRow(8)) && (
              <Button 
                onClick={buildFerry} 
                disabled={gameState.inventory.resources.wood < 10 || 
                         gameState.inventory.money < 24 || 
                         (isNearDockAtRow(1) && gameState.ferryLocations[gameState.currentRegion].has(1)) || 
                         (isNearDockAtRow(8) && gameState.ferryLocations[gameState.currentRegion].has(8))}
                className="w-36 bg-white hover:bg-gray-100"
              >
                Build Ferry (10🪵,$24)
              </Button>
            )}
            {gameState.hasRaft && !gameState.isOnSteamboat && (
              <Button 
                onClick={toggleRaft} 
                disabled={!gameState.isOnRaft && !nearDock}
                className="w-24 bg-white hover:bg-gray-100"
              >
                {gameState.isOnRaft ? 'Exit Raft' : 'Board Raft'}
              </Button>
            )}
            {nearDock && gameState.vehicles.find(v => v.type === 'steamboat')?.unlocked && (
              <Button 
                onClick={toggleSteamboat}
                disabled={(!gameState.isOnSteamboat && !nearDock) || 
                         (gameState.isOnSteamboat && !nearDock)}
                className="w-32 bg-white hover:bg-gray-100"
              >
                {gameState.isOnSteamboat ? 'Exit Steamboat' : 'Board Steamboat'}
              </Button>
            )}
            {nearDock && !gameState.vehicles.find(v => v.type === 'steamboat')?.unlocked && (
              <Button 
                onClick={buildSteamboat} 
                disabled={gameState.inventory.resources.wood < 20 || 
                         gameState.inventory.money < 50 || 
                         gameState.regionProgress.south < 5}
                className="w-48 bg-white hover:bg-gray-100"
              >
                Build Steamboat (20🪵,$50)
              </Button>
            )}
          </div>
          
          {/* Movement Controls */}
          <div className="grid grid-cols-3 gap-2 bg-slate-200 p-2 rounded-lg">
            <div className="w-16 h-16"></div>
            <Button onClick={() => movePlayer(0, -1)} className="w-16 h-16 text-xl font-bold bg-white hover:bg-gray-100">↑</Button>
            <div className="w-16 h-16"></div>
            <Button onClick={() => movePlayer(-1, 0)} className="w-16 h-16 text-xl font-bold bg-white hover:bg-gray-100">←</Button>
            <Button onClick={() => movePlayer(0, 1)} className="w-16 h-16 text-xl font-bold bg-white hover:bg-gray-100">↓</Button>
            <Button onClick={() => movePlayer(1, 0)} className="w-16 h-16 text-xl font-bold bg-white hover:bg-gray-100">→</Button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm">
        <div>Green: Land</div>
        <div>Blue: River (arrows show current)</div>
        <div>Brown: Docks</div>
        <div>Dark Green: Trees</div>
        <div>Purple: West Bank Farmers (Corn)</div>
        <div>Pink: East Bank Weavers (Textiles)</div>
        <div>Yellow Line: Ferry Connection</div>
        <div>Indigo: Textile Mills</div>
        <div>Yellow: Merchants</div>
        <div>Red: Factories</div>
        <div>Gray: Mines</div>
        <div className="text-red-500">Warning: Raft breaks if you drift to bottom!</div>
      </div>
    </div>
  );
};

export default RiverTradingGame;