import { ref } from "vue";

export type Theme = "light" | "dark" | "system";

const theme = ref<Theme>("system");

function apply(t: Theme) {
  const dark =
    t === "dark" ||
    (t === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  function init() {
    const saved = (localStorage.getItem("theme") as Theme) || "system";
    theme.value = saved;
    apply(saved);
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (theme.value === "system") apply("system");
      });
  }

  function setTheme(t: Theme) {
    theme.value = t;
    localStorage.setItem("theme", t);
    apply(t);
  }

  return { theme, setTheme, init };
}
