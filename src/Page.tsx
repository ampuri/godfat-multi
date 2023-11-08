/** @jsx jsx */
import React, { useState } from "react";
import { jsx, css } from "@emotion/react";

import ConfigContainer from "./ConfigContainer";
import TracksContainer from "./TracksContainer";
import { Typography } from "@mui/material";
import { useGodfatBanners } from "./utils/godfat";
import { useStorageLinkedString } from "./utils/config";

export type BannerData = {
  label: string;
  url: string;
};

export type ConfigData = {
  bannerData: BannerData[];
};

const globalCss = css`
  margin: 0;
  font-family: "Roboto", "Helvetica", "Arial", sans-serif;
  font-weight: 400;
  font-size: 0.875rem;
  line-height: 1.43;
  letter-spacing: 0.01071em;

  table {
    border-collapse: collapse;
  }
  table,
  td {
    white-space: nowrap;
    text-align: center;
    padding-left: 8px;
    padding-right: 8px;
  }
  th {
    border: 1px solid black;
    font-weight: bold;
  }

  td:empty::after {
    content: "\\00a0";
  }
`;

export default function Page() {
  // This is modified in TracksContainer when clicking to update seed, so it's pulled out to this level
  const [seed, setSeed] = useStorageLinkedString("seed");
  // We don't want to reload the track UNLESS the change is from within the track
  const [forceReload, setForceReload] = useState(0);
  const setSeedAndForceReload = (seed: string) => {
    setSeed(seed);
    setForceReload((forceReload) => forceReload + 1);
  };

  const [mode, setMode] = useStorageLinkedString("mode");
  const [selectedCell, setSelectedCell] = useState("");
  const resetSelectedCell = () => setSelectedCell("");
  const [plannedCells, setPlannedCells] = useState<string[]>([]);
  const addPlannedCell = (cell: string) => {
    setPlannedCells((plannedCells) => [...plannedCells, cell]);
  };
  const undoPlannedCell = () =>
    setPlannedCells((plannedCells) => plannedCells.slice(0, -1));
  const resetPlannedCells = () => setPlannedCells([]);

  const [configData, setConfigData] = React.useState<ConfigData>({
    bannerData: [],
  });

  const { isLoading, isError, banners } = useGodfatBanners();

  if (isLoading) {
    return <Typography variant="h5">Loading banner data...</Typography>;
  }
  if (isError) {
    return <Typography variant="h5">Error fetching banner data!</Typography>;
  }

  return (
    <div css={globalCss}>
      <ConfigContainer
        banners={banners}
        setConfigData={setConfigData}
        seed={seed}
        setSeed={setSeed}
        forceReload={forceReload}
        mode={mode}
        setMode={setMode}
        resetSelectedCell={resetSelectedCell}
        resetPlannedCells={resetPlannedCells}
        undoPlannedCell={undoPlannedCell}
      />
      <TracksContainer
        plannedCells={plannedCells}
        addPlannedCell={addPlannedCell}
        resetPlannedCells={resetPlannedCells}
        banners={banners}
        configData={configData}
        selectedCell={selectedCell}
        setSelectedCell={setSelectedCell}
        setSeed={setSeedAndForceReload}
        mode={mode}
      />
    </div>
  );
}
