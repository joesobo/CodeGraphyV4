import { ref } from 'vue';

export function useCounter(initialValue = 0) {
  const count = ref(initialValue);
  const increment = () => {
    count.value += 1;
  };

  return { count, increment };
}

export function formatCount(count: number): string {
  return `Count ${count}`;
}
