<template>
  <div 
    ref="tooltipContainer"
    class="custom-tooltip-container" 
    @mouseenter="show" 
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
  >
    <slot></slot>
    <div 
      ref="tooltipElement"
      v-show="showTooltip" 
      :class="['custom-tooltip', `position-${effectivePosition}`]"
      :style="tooltipStyle"
    >
      <div class="tooltip-content" v-html="content"></div>
      <div class="tooltip-arrow"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  content: {
    type: String,
    required: true
  },
  position: {
    type: String,
    default: 'top'
  }
});

const tooltipContainer = ref(null);
const tooltipElement = ref(null);
const showTooltip = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const effectivePosition = ref(props.position);

const tooltipStyle = computed(() => {
  return {
    top: `${tooltipPosition.value.y}px`,
    left: `${tooltipPosition.value.x}px`
  };
});

function calculatePosition() {
  if (!tooltipContainer.value) return;
  
  const rect = tooltipContainer.value.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  // Using a reasonable estimate for HTML content
  const contentLength = props.content.length;
  const estimatedTooltipHeight = Math.min(
    // Estimate based on content length, with a minimum of 80px
    Math.max(80, contentLength / 5), 
    // Cap at 60% of viewport height
    window.innerHeight * 0.6
  );
  const viewportHeight = window.innerHeight;
  
  // Reset effective position to the prop value initially
  effectivePosition.value = props.position;
  
  switch (props.position) {
    case 'top':
      // Check if there's enough space above, if not, position below
      if (rect.top < estimatedTooltipHeight) {
        tooltipPosition.value = {
          x: centerX,
          y: rect.bottom + 10
        };
        // Use bottom position instead
        effectivePosition.value = 'bottom';
      } else {
        tooltipPosition.value = {
          x: centerX,
          y: rect.top - 10
        };
      }
      break;
    case 'bottom':
      // Check if there's enough space below, if not, position above
      if (rect.bottom + estimatedTooltipHeight > viewportHeight) {
        tooltipPosition.value = {
          x: centerX,
          y: rect.top - 10
        };
        // Use top position instead
        effectivePosition.value = 'top';
      } else {
        tooltipPosition.value = {
          x: centerX,
          y: rect.bottom + 10
        };
      }
      break;
    case 'left':
      tooltipPosition.value = {
        x: rect.left - 10,
        y: centerY
      };
      break;
    case 'right':
      tooltipPosition.value = {
        x: rect.right + 10,
        y: centerY
      };
      break;
    default:
      // Default to smart positioning
      if (rect.top < estimatedTooltipHeight) {
        tooltipPosition.value = {
          x: centerX,
          y: rect.bottom + 10
        };
        effectivePosition.value = 'bottom';
      } else {
        tooltipPosition.value = {
          x: centerX,
          y: rect.top - 10
        };
        effectivePosition.value = 'top';
      }
  }
}

function show() {
  showTooltip.value = true;
  calculatePosition();
}

function hide() {
  showTooltip.value = false;
}
</script>

<style scoped>
.custom-tooltip-container {
  position: relative;
  display: inline-block;
  width: 100%;
}

.custom-tooltip {
  position: fixed;
  z-index: 10000;
  background: #ffffff;
  color: #333333;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  min-width: 180px;
  max-width: 320px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  border: 1px solid #e2e8f0;
  text-align: left;
  pointer-events: none;
  white-space: normal;
  line-height: 1.5;
  height: auto;
  overflow: visible;
}

.tooltip-content {
  width: 100%;
  height: auto;
}

.position-top {
  transform: translate(-50%, -100%);
}

.position-bottom {
  transform: translate(-50%, 0);
}

.position-left {
  transform: translate(-100%, -50%);
}

.position-right {
  transform: translate(0, -50%);
}

.tooltip-arrow {
  position: absolute;
  width: 12px;
  height: 12px;
  background: inherit;
  border: inherit;
  border-width: 0 0 1px 1px;
}

.position-top .tooltip-arrow {
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%) rotate(-45deg);
}

.position-bottom .tooltip-arrow {
  top: -7px;
  left: 50%;
  transform: translateX(-50%) rotate(135deg);
}

.position-left .tooltip-arrow {
  right: -7px;
  top: 50%;
  transform: translateY(-50%) rotate(-135deg);
}

.position-right .tooltip-arrow {
  left: -7px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}
</style>
