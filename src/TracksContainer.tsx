import React, { useEffect, useState } from "react";

import TrackContainer from "./TrackContainer";
import { ConfigData } from "./Page";
import { useQueries } from "react-query";
import { corsUrl } from "./utils/query";
import { Typography } from "@mui/material";
import { CatCell, extractCatsFromTable } from "./utils/godfatParsing";
import { BannerSelectOption, urlToRareCatQueryUrl } from "./utils/godfat";

export type CellData = {
  row: string;
  target?: string;
};

type QueryData = {
  trackAs: CatCell[][];
  trackBs: CatCell[][];
};

export const serSelectedCell = ({
  bannerUrl,
  num,
  track,
  isMainCat,
  isGuaranteed,
}: {
  bannerUrl: string;
  num: number;
  track: "A" | "B";
  isMainCat: boolean;
  isGuaranteed: boolean;
}) => `${bannerUrl};${num};${track};${isMainCat};${isGuaranteed}`;

export const desSelectedCell = (
  str: string
): {
  bannerUrl: string;
  num: number;
  track: "A" | "B";
  isMainCat: boolean;
  isGuaranteed: boolean;
} => {
  const split = str.split(";");
  return {
    bannerUrl: split[0],
    num: parseInt(split[1], 10),
    track: split[2] as "A" | "B",
    isMainCat: split[3] === "true",
    isGuaranteed: split[4] === "true",
  };
};

const handleCellSelection = ({
  queryData,
  selectedCell,
  configData,
  rareCats,
}: {
  queryData: QueryData;
  selectedCell: string;
  configData: ConfigData;
  rareCats: Set<string>;
}) => {
  const { bannerUrl, num, track, isMainCat, isGuaranteed } =
    desSelectedCell(selectedCell);

  // Isolate the current banner and track
  const trackIndex = configData.bannerData.findIndex(
    (data) => data.url === bannerUrl
  );
  let currentTrackList =
    track === "A"
      ? queryData.trackAs[trackIndex]
      : queryData.trackBs[trackIndex];

  // If the cell is a guaranteed, highlight it and find the destination
  let guaranteedDestinationNum = null;
  let guaranteedDestinationTrack = null;
  if (isGuaranteed) {
    const currentCatCell = currentTrackList[num - 1];
    if (isMainCat) {
      currentCatCell.guaranteeMainCat!.backgroundType = "selected";
      guaranteedDestinationNum =
        currentCatCell.guaranteeMainCat?.destinationRow;
      guaranteedDestinationTrack =
        currentCatCell.guaranteeMainCat?.destinationTrack;
    } else {
      currentCatCell.guaranteeAltCat!.backgroundType = "selected";
      guaranteedDestinationNum = currentCatCell.guaranteeAltCat?.destinationRow;
      guaranteedDestinationTrack =
        currentCatCell.guaranteeAltCat?.destinationTrack;
    }
  }

  // If not main cat, set lastCatName to a dupe to force the alt track
  let lastCatName = isMainCat ? "" : currentTrackList[num - 1].mainCat.name;
  let currentNum = num;
  let currentTrack = track;
  let numRolls = 0;
  while (true) {
    // Find the cat
    currentTrackList =
      currentTrack === "A"
        ? queryData.trackAs[trackIndex]
        : queryData.trackBs[trackIndex];
    const currentCatCell = currentTrackList[currentNum - 1];
    if (!currentCatCell) {
      break; // Probably went out of bounds
    }

    let currentCat;
    // Determine if it's a rare dupe
    const isRareDupe =
      rareCats.has(currentCatCell.mainCat.name) &&
      currentCatCell.mainCat.name === lastCatName;
    if (!isRareDupe) {
      lastCatName = currentCatCell.mainCat.name;
      currentNum += 1;
      currentCat = currentCatCell.mainCat;
    } else {
      lastCatName = currentCatCell.altCat!.name;
      currentNum = currentCatCell.altCat!.destinationRow;
      currentTrack = currentCatCell.altCat!.destinationTrack as "A" | "B";
      currentCat = currentCatCell.altCat!;
    }
    // Highlight the cat
    currentCat.backgroundType = "selected";
    numRolls += 1;

    // Exit conditions
    if (isGuaranteed) {
      // Stop when: IF (ends on A) THEN (when we get to i-1B) ELSE IF (ends on B) THEN (when we get to iA)
      if (
        (guaranteedDestinationTrack === "A" &&
          currentNum + 1 === guaranteedDestinationNum &&
          currentTrack === "B") ||
        (guaranteedDestinationTrack === "B" &&
          currentNum === guaranteedDestinationNum &&
          currentTrack === "A")
      ) {
        break;
      }
    } else {
      // For non-guaranteed cells, just stop after one pull
      if (numRolls === 1) {
        break;
      }
    }
  }

  // Highlight the entire destination row
  const nextCatNum = isGuaranteed ? guaranteedDestinationNum : currentNum;
  const nextCatTrack = isGuaranteed ? guaranteedDestinationTrack : currentTrack;
  const allTracks =
    nextCatTrack === "A" ? queryData.trackAs : queryData.trackBs;
  for (const track of allTracks) {
    const catCell = track[nextCatNum! - 1];
    if (catCell) {
      const isRareDupe =
        rareCats.has(catCell.mainCat.name) &&
        catCell.mainCat.name === lastCatName;
      if (!isRareDupe) {
        // Highlight the main and guaranteed main cats
        catCell.mainCat.backgroundType = "next";
        catCell.guaranteeMainCat!.backgroundType = "next";
      } else {
        // Highlight the alt and guaranteed alt cats
        catCell.altCat!.backgroundType = "next";
        catCell.guaranteeAltCat!.backgroundType = "next";
      }
    }
  }
};

export default function TracksContainer({
  banners,
  configData,
  setSeed,
}: {
  banners: BannerSelectOption[];
  configData: ConfigData;
  setSeed: (seed: string) => void;
}) {
  // num(int);track(A|B);mainCat(bool);guaranteed(bool)
  const [selectedCell, setSelectedCell] = useState("");

  const urls = configData.bannerData.map((data) => data.url);
  const [parsedQueryData, setParsedQueryData] = useState<QueryData>({
    trackAs: [],
    trackBs: [],
  });
  const [rareCats, setRareCats] = useState(new Set<string>());

  const queries = useQueries(
    urls.map((url) => ({
      queryKey: [url],
      queryFn: () => fetch(corsUrl(url)),
      staleTime: Infinity,
    }))
  );
  const rareCatQueries = useQueries(
    urls.map((url) => {
      const rareCatQueryUrl = urlToRareCatQueryUrl({
        url,
        banners,
      });
      return {
        queryKey: [rareCatQueryUrl],
        queryFn: () => fetch(corsUrl(rareCatQueryUrl)),
        staleTime: Infinity,
      };
    })
  );

  const allQueriesResolved =
    queries.every((query) => query.isFetched) &&
    rareCatQueries.every((query) => query.isFetched);

  useEffect(() => {
    (async () => {
      const res = {
        trackAs: [] as CatCell[][],
        trackBs: [] as CatCell[][],
      };
      const successfulQueries = queries.filter((query) => query.isSuccess);
      for (const query of successfulQueries) {
        const dataText = await query.data!.clone().text();
        const dataDom = new DOMParser().parseFromString(dataText, "text/html");
        const dataTable = dataDom.getElementsByTagName("table")[0]; // Godfat page is guaranteed to have one table
        const trackACats = extractCatsFromTable(dataTable, "A");
        const trackBCats = extractCatsFromTable(dataTable, "B");
        res.trackAs.push(trackACats);
        res.trackBs.push(trackBCats);
      }
      setParsedQueryData(res);

      const successfulRareCatQueries = rareCatQueries.filter(
        (query) => query.isSuccess
      );
      const rareCatSet = new Set<string>();
      for (const query of successfulRareCatQueries) {
        const dataText = await query.data!.clone().text();
        const dataDom = new DOMParser().parseFromString(dataText, "text/html");
        const dataDiv = dataDom.getElementsByClassName("information")[0]; // Details page is guaranteed to have one .information
        const catAnchors = dataDiv
          .getElementsByTagName("li")[0]
          .getElementsByTagName("a");
        for (const anchor of catAnchors) {
          rareCatSet.add(anchor.textContent!);
        }
      }
      setRareCats(rareCatSet);

      setSelectedCell("");
    })();

    return () => {};
  }, [allQueriesResolved, queries.length, rareCatQueries.length]); // TODO fix this?

  if (!allQueriesResolved) {
    return <Typography variant="h5">Loading banner data...</Typography>;
  }
  if (
    parsedQueryData.trackAs.length === 0 ||
    parsedQueryData.trackBs.length === 0 ||
    configData.bannerData.length !== parsedQueryData.trackAs.length ||
    configData.bannerData.length !== parsedQueryData.trackBs.length
  ) {
    return <></>;
  }

  // Deep clone parsedQueryData, so changes don't get persisted on rerender
  const queryData: QueryData = JSON.parse(JSON.stringify(parsedQueryData));

  // Highlight cats that will be pulled if a cell is clicked
  if (selectedCell) {
    handleCellSelection({
      queryData,
      selectedCell,
      configData,
      rareCats,
    });
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          padding: "10px",
        }}
      >
        <TrackContainer
          track="A"
          configData={configData}
          cells={queryData.trackAs}
          setSeed={setSeed}
          setSelectedCell={setSelectedCell}
        />
        <TrackContainer
          track="B"
          configData={configData}
          cells={queryData.trackBs}
          setSeed={setSeed}
          setSelectedCell={setSelectedCell}
        />
      </div>
    </>
  );
}
