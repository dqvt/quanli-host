<script setup>
import { ref, watch, computed } from 'vue';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';

const props = defineProps({
  modelValue: {
    type: [String, Number, Object, Array],
    default: null
  },
  options: {
    type: Array,
    default: () => []
  },
  optionLabel: {
    type: String,
    default: 'label'
  },
  optionValue: {
    type: String,
    default: 'value'
  },
  placeholder: {
    type: String,
    default: 'Select an option'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  filter: {
    type: Boolean,
    default: true
  },
  showClear: {
    type: Boolean,
    default: false
  },
  class: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

// Local value for the dropdown
const selectedValue = ref(props.modelValue);
const searchValue = ref('');
const isDropdownVisible = ref(false);

// Watch for changes in the model value from parent
watch(() => props.modelValue, (newValue) => {
  selectedValue.value = newValue;
});

// Watch for changes in the local value and emit to parent
watch(() => selectedValue.value, (newValue) => {
  emit('update:modelValue', newValue);
});

// Filter options based on search value
const filteredOptions = computed(() => {
  if (!searchValue.value.trim() || !props.filter) {
    return props.options;
  }
  
  const searchLower = searchValue.value.toLowerCase();
  return props.options.filter(option => {
    const optionText = typeof option === 'object' 
      ? String(option[props.optionLabel] || '').toLowerCase() 
      : String(option).toLowerCase();
    
    return optionText.includes(searchLower);
  });
});

// Find display text for current value
const selectedItemText = computed(() => {
  if (selectedValue.value === null || selectedValue.value === undefined) {
    return props.placeholder;
  }
  
  const selectedOption = props.options.find(option => {
    if (typeof option === 'object') {
      return option[props.optionValue] === selectedValue.value;
    } else {
      return option === selectedValue.value;
    }
  });
  
  if (selectedOption) {
    return typeof selectedOption === 'object' 
      ? selectedOption[props.optionLabel] 
      : selectedOption;
  }
  
  return props.placeholder;
});

// Clear the search when dropdown is hidden
const onHide = () => {
  searchValue.value = '';
  isDropdownVisible.value = false;
};

// Handle dropdown showing
const onShow = () => {
  isDropdownVisible.value = true;
};

// Clear selection
const clearSelection = () => {
  selectedValue.value = null;
  emit('update:modelValue', null);
};
</script>

<template>
  <div class="searchable-select-container">
    <Dropdown
      v-model="selectedValue"
      :options="filteredOptions"
      :optionLabel="optionLabel"
      :optionValue="optionValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :showClear="showClear"
      :class="class"
      @hide="onHide"
      @show="onShow"
    >
      <template #header>
        <div class="p-2 border-bottom-1 surface-border">
          <span class="p-input-icon-left w-full">
            <i class="pi pi-search" />
            <InputText
              v-model="searchValue"
              class="w-full"
              :placeholder="'Search ' + placeholder.toLowerCase()"
              @keydown.stop
            />
          </span>
        </div>
      </template>
      <template #value="slotProps">
        <slot name="value" :value="slotProps.value">
          <div>{{ selectedItemText }}</div>
        </slot>
      </template>
      <template #option="slotProps">
        <slot name="option" :option="slotProps.option">
          <div>{{ typeof slotProps.option === 'object' ? slotProps.option[optionLabel] : slotProps.option }}</div>
        </slot>
      </template>
      <template #footer>
        <slot name="footer"></slot>
      </template>
    </Dropdown>
  </div>
</template>

<style scoped>
.searchable-select-container {
  position: relative;
  width: 100%;
}
</style> 