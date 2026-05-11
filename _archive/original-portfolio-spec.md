# Infinite Canvas Portfolio - Project Specification

## Project Overview

Build an interactive infinite canvas portfolio website inspired by Cash App's design system and Make Tangible's portfolio. The experience centers on a draggable infinite grid of visual items (3D icons, graphics, images) that users can explore by clicking and dragging, with hover effects and click-through navigation to detailed project pages.

## Core Features

### 1. Infinite Canvas Navigation
- **Click-and-drag panning**: Users can click anywhere and drag to navigate the canvas
- **Smooth momentum scrolling**: Canvas continues moving briefly after drag release (easing/inertia)
- **Boundary-free exploration**: No hard edges, seamless infinite scrolling in all directions
- **Performance optimized**: Only render visible items + buffer zone
- **Cursor feedback**: Grab cursor when hovering over canvas, grabbing cursor when dragging

### 2. Grid System
- **Dynamic grid layout**: Items arranged in a staggered/masonry-style grid
- **Consistent spacing**: Uniform gaps between items (suggest 40-60px)
- **Responsive sizing**: Items scale appropriately for different screen sizes
- **Viewport-aware rendering**: Cull items outside the visible viewport + buffer

### 3. Item Interactions
- **Hover effects**:
  - Smooth scale transformation (1.0 → 1.1 scale)
  - Subtle elevation shadow
  - Possible glow/border effect
  - Cursor changes to pointer
  - Smooth CSS transitions (300ms ease-out)

- **Click behavior**:
  - Navigate to detail page/modal
  - Prevent navigation if user is actively dragging
  - Distinguish between click vs drag (threshold: 5-10px movement)

### 4. Visual Design
- **Dark background**: Black or very dark gray (#000000 or #0a0a0a)
- **Item cards**: Clean, modern containers with subtle borders or shadows
- **Typography**: Modern sans-serif (Inter, SF Pro, or similar)
- **Animations**: Smooth, performant, 60fps target
- **Loading states**: Skeleton screens or fade-in animations for items

## Technical Stack Recommendations

### Core Technologies
- **React** (with TypeScript preferred) - Component architecture
- **Next.js** (optional) - If you want routing and SSR
- **Framer Motion** - Smooth animations and gestures
- **React Spring** (alternative) - Physics-based animations

### Infinite Canvas Library Options

**Option 1: Custom Implementation with Framer Motion** (Recommended)
```javascript
// Using framer-motion's drag and pan capabilities
import { motion, useMotionValue, useTransform } from 'framer-motion'
```
- Most control over UX
- Lighter weight
- Better for this specific use case

**Option 2: react-zoomable-ui**
- Purpose-built for infinite canvas
- Includes zoom functionality
- More features than you may need

**Option 3: react-grid-layout**
- Great for grid management
- May need custom infinite scroll wrapper

### Additional Libraries
- **@react-three/fiber** + **@react-three/drei** - If you want 3D elements
- **Lottie-react** - For animated graphics/icons
- **Intersection Observer API** - Lazy loading and viewport detection
- **use-gesture** - Advanced gesture handling

## Placeholder Assets

### Image Placeholder Sources
1. **Unsplash Source API**: `https://source.unsplash.com/random/400x400?{keyword}`
2. **Lorem Picsum**: `https://picsum.photos/400/400?random={id}`
3. **DiceBear Avatars**: For generated SVG illustrations
4. **Placeholder.com**: `https://via.placeholder.com/400x400`

### 3D Icon Placeholder Sources
1. **3D Icons Library**: 
   - [3dicons.co](https://3dicons.co) - Free 3D icons similar to Cash App style
   - [icons8.com/illustrations](https://icons8.com/illustrations) - 3D illustrations
   - [Storyset](https://storyset.com) - Animated illustrations

2. **Spline**: Export 3D scenes as interactive components
3. **Three.js primitives**: Create simple geometric shapes as placeholders

### Sample Placeholder Array
```javascript
const placeholderItems = [
  { id: 1, type: 'image', src: 'https://source.unsplash.com/random/400x400?tech', title: 'Project Alpha' },
  { id: 2, type: 'image', src: 'https://source.unsplash.com/random/400x400?design', title: 'Project Beta' },
  { id: 3, type: 'icon', emoji: '🎨', bgColor: '#FF6B6B', title: 'Creative Work' },
  { id: 4, type: 'icon', emoji: '💻', bgColor: '#4ECDC4', title: 'Development' },
  { id: 5, type: 'image', src: 'https://source.unsplash.com/random/400x400?abstract', title: 'Project Gamma' },
  // Generate 50-100 items for initial prototype
]
```

## Interaction Specifications

### Pan/Drag Behavior
```javascript
// Pseudocode for drag logic
const handleDragStart = (event) => {
  setIsDragging(true)
  setStartPosition({ x: event.clientX, y: event.clientY })
}

const handleDrag = (event, info) => {
  setCanvasOffset({
    x: canvasOffset.x + info.delta.x,
    y: canvasOffset.y + info.delta.y
  })
}

const handleDragEnd = (event, info) => {
  setIsDragging(false)
  
  // Add momentum/inertia
  if (Math.abs(info.velocity.x) > threshold || Math.abs(info.velocity.y) > threshold) {
    applyMomentum(info.velocity)
  }
}
```

### Item Click Detection
```javascript
const handleItemClick = (item, event) => {
  // Prevent click if user dragged more than threshold
  const dragDistance = Math.sqrt(
    Math.pow(currentPos.x - startPos.x, 2) + 
    Math.pow(currentPos.y - startPos.y, 2)
  )
  
  if (dragDistance < 10) {
    navigateToDetail(item.id)
  }
}
```

### Viewport Culling
```javascript
const getVisibleItems = (items, viewport, canvasOffset) => {
  return items.filter(item => {
    const itemBounds = calculateBounds(item, canvasOffset)
    return intersects(itemBounds, viewport)
  })
}
```

## Performance Considerations

### Optimization Strategies
1. **Virtual scrolling**: Only render items in viewport + buffer
2. **RAF for animations**: Use requestAnimationFrame for smooth 60fps
3. **Debounce resize/scroll events**: Prevent excessive recalculations
4. **CSS transforms over position**: Use translate3d for GPU acceleration
5. **Image lazy loading**: Load images as they approach viewport
6. **Memoization**: React.memo for item components
7. **Web Workers**: Offload heavy calculations if needed

### Performance Targets
- 60fps during all interactions
- < 100ms interaction response time
- < 2s initial page load
- Smooth on devices with 4GB RAM

## File Structure

```
portfolio-canvas/
├── src/
│   ├── components/
│   │   ├── InfiniteCanvas.tsx        # Main canvas container
│   │   ├── GridItem.tsx              # Individual portfolio item
│   │   ├── ItemDetail.tsx            # Detail view/modal
│   │   └── Navigation.tsx            # Optional nav overlay
│   ├── hooks/
│   │   ├── useInfiniteCanvas.ts      # Canvas state management
│   │   ├── useViewportItems.ts       # Visible item calculation
│   │   └── useDragToScroll.ts        # Drag interaction logic
│   ├── data/
│   │   └── placeholderItems.ts       # Placeholder data
│   ├── styles/
│   │   ├── globals.css               # Global styles
│   │   └── canvas.module.css         # Canvas-specific styles
│   └── utils/
│       ├── geometry.ts               # Position/bounds calculations
│       └── animation.ts              # Animation helpers
├── public/
│   └── placeholders/                 # Local placeholder assets
└── package.json
```

## Development Phases

### Phase 1: Core Canvas (Days 1-2)
- [ ] Set up React + TypeScript project
- [ ] Implement basic drag-to-pan functionality
- [ ] Create grid layout system
- [ ] Add viewport culling

### Phase 2: Interactions (Days 3-4)
- [ ] Add momentum scrolling
- [ ] Implement hover effects
- [ ] Handle click vs drag detection
- [ ] Add smooth animations

### Phase 3: Content & Polish (Days 5-6)
- [ ] Integrate placeholder assets
- [ ] Add loading states
- [ ] Implement detail view/navigation
- [ ] Performance optimization
- [ ] Responsive design

### Phase 4: Visual Design (Days 7+)
- [ ] Replace placeholders with real assets
- [ ] Fine-tune animations and timing
- [ ] Add micro-interactions
- [ ] Cross-browser testing

## Starter Code Example

```tsx
// InfiniteCanvas.tsx - Simplified starting point
import { motion, useMotionValue } from 'framer-motion'
import { useState, useEffect } from 'react'
import GridItem from './GridItem'

const InfiniteCanvas = () => {
  const [items, setItems] = useState([])
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  useEffect(() => {
    // Generate placeholder items
    const generated = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: (i % 10) * 300,
      y: Math.floor(i / 10) * 300,
      type: 'placeholder',
      src: `https://source.unsplash.com/random/400x400?sig=${i}`
    }))
    setItems(generated)
  }, [])

  return (
    <motion.div
      className="canvas-container"
      drag
      dragConstraints={{ left: -5000, right: 5000, top: -5000, bottom: 5000 }}
      dragElastic={0.1}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      style={{ x, y }}
    >
      {items.map(item => (
        <GridItem key={item.id} item={item} />
      ))}
    </motion.div>
  )
}

export default InfiniteCanvas
```

## Design References

### Cash App Design System
- Bold, confident interactions
- Bright accent colors on dark backgrounds
- 3D-style icons with depth
- Smooth, physics-based animations
- Green (#00D632) as primary accent

### Make Tangible Portfolio
- Minimal, clean aesthetic
- High-quality 3D renders
- Generous white space
- Hover effects that reveal information
- Professional, refined feel

## Success Criteria

The prototype is successful when:
1. ✅ Canvas pans smoothly at 60fps
2. ✅ Grid items respond to hover with smooth transitions
3. ✅ Click vs drag is reliably detected
4. ✅ Only visible items are rendered (performance)
5. ✅ Momentum scrolling feels natural
6. ✅ Works across modern browsers (Chrome, Firefox, Safari)
7. ✅ Responsive on tablet and desktop sizes
8. ✅ Easy to replace placeholder content with real assets

## Additional Resources

### Documentation
- [Framer Motion Docs](https://www.framer.com/motion/)
- [React Spring Docs](https://react-spring.dev/)
- [CSS Transforms MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)

### Inspiration
- [Cash App Design](https://design.cash.app/)
- [Make Tangible Portfolio](https://www.maketangible.in/portfolio/drvjuice)
- [Linear.app](https://linear.app) - Smooth interactions
- [Stripe.com](https://stripe.com) - Polished animations

### Tools
- **Spline** - 3D design and export
- **Rive** - Interactive animations
- **Lottie** - After Effects animations for web

---

## Next Steps

1. Review this specification
2. Choose your tech stack (recommend React + Framer Motion)
3. Set up development environment
4. Start with Phase 1: Core Canvas
5. Iterate based on feel and performance
6. Replace placeholders with your actual work

Feel free to adjust any of these specifications based on your preferences and needs!
