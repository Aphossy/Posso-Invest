// Custom transitions for different page types
export function slideInOut() {
  document.documentElement.animate(
    [
      {
        opacity: 1,
        transform: "translate(0, 0)",
      },
      {
        opacity: 0,
        transform: "translate(-100px, 0)",
      },
    ],
    {
      duration: 400,
      easing: "ease",
      fill: "forwards",
      pseudoElement: "::view-transition-old(root)",
    }
  )

  document.documentElement.animate(
    [
      {
        opacity: 0,
        transform: "translate(100px, 0)",
      },
      {
        opacity: 1,
        transform: "translate(0, 0)",
      },
    ],
    {
      duration: 400,
      easing: "ease",
      fill: "forwards",
      pseudoElement: "::view-transition-new(root)",
    }
  )
}

export function fadeTransition() {
  document.documentElement.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: 300,
    easing: "ease",
    fill: "forwards",
    pseudoElement: "::view-transition-old(root)",
  })

  document.documentElement.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 300,
    easing: "ease",
    fill: "forwards",
    pseudoElement: "::view-transition-new(root)",
  })
}

export function zoomTransition() {
  document.documentElement.animate(
    [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.95)" },
    ],
    {
      duration: 300,
      easing: "ease",
      fill: "forwards",
      pseudoElement: "::view-transition-old(root)",
    }
  )

  document.documentElement.animate(
    [
      { opacity: 0, transform: "scale(1.05)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    {
      duration: 300,
      easing: "ease",
      fill: "forwards",
      pseudoElement: "::view-transition-new(root)",
    }
  )
}
