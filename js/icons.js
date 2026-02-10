const svgNS = "http://www.w3.org/2000/svg";

const createBaseSVG = (width, height, viewBox = "0 0 24 24") => {
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.classList.add("lucide-icon");
  return svg;
};

const createPath = (d) => {
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", d);
  return path;
};

const createCircle = (cx, cy, r) => {
  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("cx", cx);
  circle.setAttribute("cy", cy);
  circle.setAttribute("r", r);
  return circle;
};

export const Icons = {
  createDeadlineIcon: () => {
    const svg = createBaseSVG(10, 10);
    svg.append(
      createPath("M16 14v2.2l1.6 1"),
      createPath("M16 2v4"),
      createPath("M8 2v4"),
      createPath("M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"),
      createPath("M3 10h5"),
      createCircle(16, 16, 6)
    );
    return svg;
  },

  createLocationIcon: () => {
    const svg = createBaseSVG(10, 10);
    svg.append(
      createPath("M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"),
      createCircle(12, 10, 3)
    );
    return svg;
  },

  createRepeatIcon: () => {
    const svg = createBaseSVG(14, 14);
    svg.append(
      createPath("m17 2 4 4-4 4"),
      createPath("M3 11v-1a4 4 0 0 1 4-4h14"),
      createPath("m7 22-4-4 4-4"),
      createPath("M21 13v1a4 4 0 0 1-4 4H3")
    );
    return svg;
  },

  createCheckIcon: () => {
    const svg = createBaseSVG(14, 14);
    svg.append(
      createPath("M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"),
      createPath("m9 11 3 3L22 4")
    );
    return svg;
  },

  createDeleteIcon: () => {
    const svg = createBaseSVG(20, 20);
    svg.setAttribute("stroke", "#ff4444");
    svg.append(
      createPath("M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"),
      createPath("M3 6h18"),
      createPath("M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2")
    );
    return svg;
  },

  createEllipsisIcon: () => {
    const svg = createBaseSVG(20, 20);
    svg.append(
      createCircle(12, 12, 1),
      createCircle(19, 12, 1),
      createCircle(5, 12, 1)
    );
    return svg;
  },

  createGoalIcon: () => {
    const svg = createBaseSVG(16, 16);
    svg.append(
      createPath("M12 13V2l8 4-8 4"),
      createPath("M20.561 10.222a9 9 0 1 1-12.55-5.29"),
      createPath("M8.002 9.997a5 5 0 1 0 8.9 2.02")
    );
    return svg;
  },

  createDescriptionIcon: () => {
    const svg = createBaseSVG(10, 10);
    svg.append(
      createPath("M21 6H3"),
      createPath("M21 12H3"),
      createPath("M17 18H3")
    );
    return svg;
  },

  createPencilIcon: () => {
    const svg = createBaseSVG(14, 14);
    svg.append(
      createPath("M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"),
      createPath("m15 5 4 4")
    );
    return svg;
  }
};