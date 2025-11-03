# Infinite Canvas Portfolio

An interactive infinite canvas portfolio inspired by Cash App's design system. Features a draggable infinite grid of 3D geometric shapes with smooth animations and hover effects.

## Features

✅ **Infinite Canvas Navigation**
- Click-and-drag panning with smooth momentum scrolling
- Boundary-free exploration in all directions
- Cursor feedback (grab/grabbing)

✅ **3D Geometric Shapes**
- Six different Three.js primitives: Box, Sphere, Torus, Cone, Cylinder, Octahedron
- Vibrant Cash App-inspired color palette
- Smooth rotation animations on hover

✅ **Performance Optimized**
- Viewport culling - only renders visible items + buffer zone
- 60fps target performance
- Efficient React + Framer Motion + Three.js integration

✅ **Interactive Design**
- Hover effects with scale transformation and glow
- Click vs drag detection (threshold: 10px)
- Dark background (#0a0a0a) with modern aesthetic
- Subtle shadows and borders

## Tech Stack

- **React 18** + **TypeScript** - Type-safe component architecture
- **Vite** - Fast build tooling and hot module replacement
- **Framer Motion** - Smooth animations and drag interactions
- **Three.js** + **@react-three/fiber** + **@react-three/drei** - 3D graphics
- **Tailwind CSS** - Utility-first styling

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server will start at `http://localhost:5173/`

## Project Structure

```
src/
├── components/
│   ├── InfiniteCanvas.tsx    # Main canvas with drag-to-pan
│   ├── GridItem.tsx           # Individual portfolio item card
│   └── Shape3D.tsx            # Three.js geometric shapes
├── hooks/
│   ├── useInfiniteCanvas.ts   # Canvas drag/pan state management
│   └── useViewportItems.ts    # Viewport culling logic
├── data/
│   └── placeholderItems.ts    # Generates 50 placeholder items
├── types/
│   └── index.ts               # TypeScript type definitions
├── App.tsx                     # Root component
├── main.tsx                    # App entry point
└── index.css                   # Global styles + Tailwind
```

## Key Implementation Details

### Drag & Pan Logic

The `useInfiniteCanvas` hook manages:
- Drag state tracking
- Momentum scrolling with velocity-based inertia
- Click vs drag detection (< 10px = click)
- Smooth spring animations via Framer Motion

### Viewport Culling

The `useViewportItems` hook:
- Calculates visible bounds with 500px buffer zone
- Filters items for rendering
- Updates on canvas pan/drag
- Significantly improves performance with large item counts

### 3D Shapes

Each `GridItem` contains:
- Three.js Canvas with camera and lighting
- Animated 3D geometric primitive
- Hover-triggered rotation speed increase
- Idle rotation animation

## Customization

### Add More Items

Edit `src/data/placeholderItems.ts`:

```typescript
export const placeholderItems = generatePlaceholderItems(100); // Increase count
```

### Change Colors

Update the color palette in `src/data/placeholderItems.ts`:

```typescript
const colors = [
  '#00D632', // Add your colors here
  // ...
];
```

### Modify Grid Layout

Adjust spacing in `src/data/placeholderItems.ts`:

```typescript
const itemsPerRow = 10; // Items per row
const itemWidth = 300;  // Item width in px
const itemHeight = 300; // Item height in px
const gap = 60;         // Gap between items
```

### Adjust Hover Effects

Edit `src/components/GridItem.tsx`:

```typescript
whileHover={{
  scale: 1.1, // Increase scale
  transition: { duration: 0.2 }, // Faster transition
}}
```

## Next Steps

- [ ] Replace placeholder 3D shapes with real project assets
- [ ] Implement detail view/modal on item click
- [ ] Add filtering or search functionality
- [ ] Integrate with CMS or data source
- [ ] Add loading states and transitions
- [ ] Implement responsive design for mobile/tablet
- [ ] Add keyboard navigation (arrow keys)
- [ ] Implement zoom in/out functionality

## Performance Tips

1. **Viewport Culling**: Adjust buffer size in `useViewportItems` if needed
2. **Three.js Optimization**: Reduce polygon count on 3D shapes for mobile
3. **Lazy Loading**: Implement image lazy loading if using real assets
4. **Memoization**: Components already use React.memo where beneficial
5. **Bundle Size**: Use dynamic imports for heavy components

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers with WebGL support

## License

ISC

## References

- [Portfolio Specification](./Portfolio%20Spec.md)
- [Cash App Design System](https://design.cash.app/)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Three.js Docs](https://threejs.org/docs/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
