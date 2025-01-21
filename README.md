# Green River Concept Demo - Setup Instructions

## Prerequisites
- Node.js and npm installed on your computer
- A React project (you can create one using Create React App or Next.js)

## Required Dependencies
Add these to your project using npm or yarn:

```bash
npm install @/components/ui   # For UI components
npm install lucide-react     # For icons
```

## Required Component Setup
This game uses components from the shadcn/ui library. You'll need to set up the following components:

1. Button component (`@/components/ui/button`)
2. Card component (`@/components/ui/card`)

To install these components using shadcn/ui, run:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

## File Structure
Create the following files in your project:

1. `RiverTradingGame.tsx` - The main game component (copy the full component code)
2. Include the component in your page:

```tsx
import RiverTradingGame from './RiverTradingGame';

export default function GamePage() {
  return (
    <div>
      <RiverTradingGame />
    </div>
  );
}
```

## Game Features
- Multiple regions (South, Central, North) with different resources and traders
- Trading system with corn and textiles
- Transportation options: raft, ferry, and steamboat
- Resource gathering (wood from trees)
- Progress system to unlock advanced features
- Grid-based movement with river mechanics

## Controls
- Arrow buttons for movement
- Action buttons appear contextually when near interactive elements:
  - Chop Tree (near trees)
  - Build/Board Raft (near docks)
  - Build Ferry (at specific dock locations)
  - Build Steamboat (unlocks after 5 successful trades)

## Tips for Players
- Start by gathering wood from trees
- Build a raft to cross the river
- Trade corn and textiles between banks to make money
- Watch out for the river current when rafting
- Save up for the steamboat to unlock new regions

## Common Issues
1. If components aren't styled correctly, make sure your project includes Tailwind CSS setup
2. If the UI components aren't found, verify the shadcn/ui installation
3. Make sure all imports are pointing to the correct locations in your project structure