import { GetStreamingAvailabilityReturn } from "@/app/services/streamingAvail";

interface StreamingAvailabilityProps {
  streamingAvailability: GetStreamingAvailabilityReturn;
}

const StreamingAvailabilityList: React.FC<StreamingAvailabilityProps> = ({ streamingAvailability }) => {
  if (!streamingAvailability || 'error' in streamingAvailability || streamingAvailability.streamingOptions.length === 0) {
    return <p>No streaming availability information available</p>;
  }

  return (
    <div>
      <h2>Streaming Availability in the US</h2>
      <ul>
        {streamingAvailability.streamingOptions.map((option, i) => (
          <li key={`${option.serviceName}-${option.type}-${option.quality || "NA"}-${i}`}>
            {option.serviceName}: {option.type} ({option.quality})
            {option.link && (
              <a href={option.link} target="_blank" rel="noopener noreferrer">
                Watch
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StreamingAvailabilityList;
