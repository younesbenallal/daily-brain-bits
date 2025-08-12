import React, { useState } from "react";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { SelectNative } from "@/components/ui/select-native";
import { timezones, frequencies } from "../utils/utils";
import Card from "@/app/components/card/Card";

const Preference = ({ onNext }: { onNext: () => void }) => {
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [frequency, setFrequency] = useState("daily");

  return (
    <Card title="Gimme your preferences">
      <p className="text-gray-light text-base mb-10">
        Help us craft your experience to your wishes.
      </p>

      {/* Timezone */}
      <div className="mb-10 flex flex-col gap-1">
        <h2 className="text-lg font-bold text-red-dark mb-1">Timezone</h2>
        <p className="text-gray-dark text-sm mb-2">
          We tried to guess the timezone of your area.
        </p>
        <SelectNative
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </SelectNative>
      </div>

      {/* Email frequency */}
      <div className="mb-8 flex flex-col gap-1">
        <h2 className="text-lg font-bold text-red-dark mb-1">
          Email frequency
        </h2>
        <p className="text-gray-dark text-sm mb-2">
          What is the frequency you wish to receive your notes reminders by
          email? We advise daily to maximise learnings
        </p>
        <SelectNative
          id="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          {frequencies.map((freq) => (
            <option key={freq.value} value={freq.value}>
              {freq.label}
            </option>
          ))}
        </SelectNative>
      </div>

      {/* Next Button */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-2 bg-brand text-white px-8 py-3 rounded-[var(--radius-12)] font-medium text-base hover:bg-[#e04b8a] transition-all shadow"
        >
          Next
          <ArrowForwardIosIcon fontSize="small" />
        </button>
      </div>
    </Card>
  );
};

export default Preference;
