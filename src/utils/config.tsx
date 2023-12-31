import { useState } from "react";
import { BannerData } from "../Page";
import {
  DEFAULT_GUARANTEE_TEMPLATE,
  DEFAULT_MULTI_TEMPLATE,
  DEFAULT_SINGLE_TEMPLATE,
} from "../PlannedOutputModal";

const DEFAULTS = {
  seed: "",
  lastCatId: 0,
  count: 100,
  inputKeys: [],
  mode: "simulate",
  singleTemplate: DEFAULT_SINGLE_TEMPLATE,
  multiTemplate: DEFAULT_MULTI_TEMPLATE,
  guaranteeTemplate: DEFAULT_GUARANTEE_TEMPLATE,
};

const URL_INPUT_DEFAULTS = {
  inputType: "select",
  selectedBanner: "",
  numFutureUbers: 0,
  inputUrl: "",
  customName: "",
};

function useStorageLinked<T>({
  key,
  ser,
  des,
}: {
  key: string;
  ser: (value: T) => string;
  des: (value: string) => T;
}): [T, (value: T) => void] {
  let initialValue = (DEFAULTS[key as keyof typeof DEFAULTS] ??
    URL_INPUT_DEFAULTS[key.split(":")[1] as keyof typeof URL_INPUT_DEFAULTS] ??
    "") as T;
  if (sessionStorage.getItem(key) !== null) {
    initialValue = des(sessionStorage.getItem(key) as string);
  }
  const [value, setValue] = useState<T>(initialValue);
  const linkedSetValue = (value: T) => {
    sessionStorage.setItem(key, ser(value));
    setValue(value);
  };
  return [value, linkedSetValue];
}

export const useStorageLinkedString = (key: string) =>
  useStorageLinked<string>({
    key,
    ser: (str) => str,
    des: (str) => str,
  });

export const useStorageLinkedBoolean = (key: string) =>
  useStorageLinked<boolean>({
    key,
    ser: (bool) => bool.toString(),
    des: (bool) => bool === "true",
  });

export const useStorageLinkedNumber = (key: string) =>
  useStorageLinked<number>({
    key,
    ser: (num) => num.toString(),
    des: (num) => parseInt(num, 10),
  });

type UrlInputData = {
  key: string;
  value: BannerData;
};
// We only store the keys of the inputs in sessionStorage, the rest of the data is generated at runtime
export const useStorageLinkedInputs = (
  key: string
): [
  UrlInputData[],
  (setter: (prevInputs: UrlInputData[]) => UrlInputData[]) => void
] => {
  let initialValue = DEFAULTS[key as keyof typeof DEFAULTS] ?? [];
  if (sessionStorage.getItem(key) !== null) {
    initialValue = JSON.parse(sessionStorage.getItem(key) as string).map(
      (key: string) => ({
        key,
        value: { label: "", url: "" },
      })
    );
  }
  const [inputs, setInputs] = useState<UrlInputData[]>(
    initialValue as UrlInputData[]
  );
  const linkedSetInputs = (
    setter: (prevInputs: UrlInputData[]) => UrlInputData[]
  ) => {
    const storageLinkedSetter = (prevInputs: UrlInputData[]) => {
      const newInputs = setter(prevInputs);
      sessionStorage.setItem(
        key,
        JSON.stringify(newInputs.map(({ key }) => key))
      );
      return newInputs;
    };
    setInputs(storageLinkedSetter);
  };
  return [inputs, linkedSetInputs];
};

export const useQueryParamLinkedString = (
  key: string
): [string, (value: string, reload: boolean) => void] => {
  const initialUrl = new URL(window.location.href);
  let initialValue = (DEFAULTS[key as keyof typeof DEFAULTS] as string) ?? "";
  if (initialUrl.searchParams.has(key)) {
    initialValue = initialUrl.searchParams.get(key) as string;
  }
  const [value, setValue] = useState(initialValue);
  const linkedSetValue = (value: string, reload: boolean) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set(key, value);
    if (reload) {
      window.location.href = currentUrl.href;
    } else {
      window.history.replaceState({}, "", currentUrl.href);
      setValue(value);
    }
  };
  return [value, linkedSetValue];
};
