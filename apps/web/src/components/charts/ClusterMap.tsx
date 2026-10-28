import { Typography } from "@mui/material";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import useFiltersStore from "../../../store/filters.store";
import RetailerService from "../../../service/RetailerService";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";


interface Outlet {
  retailer_id: number;
  lat: number;
  longi: number;
  outlet_name: string;
  outlet_photo: string;
  street_address: string;
  district: string;
  taluka: string;
  pin_code: string;
  owner_name: string;
  contact_no: string;
  u_name: string;
  user_contact_no: string;
  type_name: string;
}

type Props = { setLoading: ({ map }: { map: boolean }) => void; setLoadingPercentage: (num: number) => void };

function ClusterMap({ setLoading, setLoadingPercentage }: Props) {
  const { selectedOutletTypes, selectedDistricts, selectedTaluk, selectedPincode, selectedUser, selectedStatus, selectedDateRange, selectedAdditionalFilter } = useFiltersStore();

  // Use a ref to store the entire marker data.
  const visitsDataRef = useRef<Outlet[]>([]);

  const [renderTrigger, setRenderTrigger] = useState(0);

  const batchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const batchIndexRef = useRef(0);
  const allowedBatchSize = 20000;

  useEffect(() => {
    fetchData();
    // Cleanup: Reset the ref when filters change.
    return () => {
      visitsDataRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOutletTypes, selectedDistricts, selectedTaluk, selectedPincode, selectedUser, selectedStatus, selectedDateRange, selectedAdditionalFilter]);

  const fetchData = async () => {
    console.log("fetchData ");

    try {
      setLoading({ map: true });
      const params = {
        start_date: selectedDateRange?.from,
        end_date: selectedDateRange?.to,
        outlet_type_id: selectedOutletTypes?.toString(),
        district: selectedDistricts?.toString(),
        taluka: selectedTaluk?.toString(),
        pin_code: selectedPincode?.toString(),
        created_by: selectedUser?.toString(),
        rec_status: selectedStatus?.toString(),
        ...selectedAdditionalFilter,
      };
      const response = await RetailerService.getMapdata(params);
      const allData: Outlet[] = response?.data || [];

      visitsDataRef.current = [];
      batchIndexRef.current = 0;

      const batchSize = 6000;
      const delayBetweenBatches = 2000;

      if (batchIntervalRef.current) {
        clearInterval(batchIntervalRef.current);
      }

      if (allData.length <= allowedBatchSize) {
        batchIntervalRef.current = setInterval(() => {
          const start = batchIndexRef.current * batchSize;
          const end = start + batchSize;
          if (start >= allData.length) {
            setLoading({ map: false });

            clearInterval(batchIntervalRef.current!);
            setLoadingPercentage(100);
            return;
          }
          visitsDataRef.current = [...visitsDataRef.current, ...allData.slice(start, end)];
          console.log("Processing batch:", batchIndexRef.current, "start:", start, "end:", end);
          setRenderTrigger((prev) => prev + 1);
          const percentage = (Math.min(end, allData.length) / allData.length) * 100;
          const newPercentage = Math.round(Math.min(percentage, 100));
          setLoadingPercentage(newPercentage);
          batchIndexRef.current++;
        }, delayBetweenBatches);
      } else {
        setLoading({ map: false });
      }
    } catch (error) {
      console.error("Error fetching map data:", error);
    }
  };

  const customIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      }),
    []
  );

  // Memoize markers based on the ref data.
  const memoizedMarkers = useMemo(
    () =>
      visitsDataRef.current.map((outlet) => (
        <Marker key={outlet.retailer_id} position={[outlet.lat, outlet.longi]} icon={customIcon}>
          <Tooltip direction="top" offset={[0, -32]} opacity={1} permanent={false}>
            <div style={{ textAlign: "center" }}>
              <img
                src={outlet.outlet_photo}
                alt={`${outlet.outlet_name} Photo`}
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "1px",
                  marginBottom: "2px",
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                {outlet.outlet_name}
              </Typography>
            </div>
          </Tooltip>
          <Popup>
            <div style={{ textAlign: "center" }}>
              <div className="flex items-center justify-center">
                <a href={outlet.outlet_photo} target="_blank" rel="noopener noreferrer">
                  <img
                    src={outlet.outlet_photo}
                    alt={`${outlet.outlet_name} Photo`}
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "15px",
                      marginBottom: "15px",
                    }}
                  />
                </a>
              </div>
              <div className="text-start space-y-2">
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  Outlet Name: {outlet.outlet_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> Outlet type: </span>
                  {outlet.type_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> Street Address: </span>
                  <a href={`https://www.google.com/maps?q=${outlet.lat},${outlet.longi}`} target="_blank" rel="noopener noreferrer">
                    {outlet.street_address}
                  </a>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> District: </span>
                  {outlet.district}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> Taluk: </span>
                  {outlet.taluka}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> Pincode: </span>
                  {outlet.pin_code}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> Owner Name: </span>
                  {outlet.owner_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> Owner's Contact: </span>
                  {outlet.contact_no}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> Submitted User: </span>
                  {outlet.u_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <span className="text-gray-600 font-bold"> Submitted User Contact: </span>
                  {outlet.user_contact_no}
                </Typography>
              </div>
            </div>
          </Popup>
        </Marker>
      )),
    // Depend on renderTrigger to update when new batches are appended.
    [renderTrigger, customIcon]
  );

  return (
    <div className="bg-white rounded-lg w-full ">
      <div className="h-3/4 bg-gray-200 rounded-lg w-full">
        <MapContainer center={[12.9716, 77.5946]} zoom={7} style={{ height: "600px", width: "100%", borderRadius: "8px" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MarkerClusterGroup
            chunkedLoading={true}
            chunkDelay={500}
            chunkInterval={1000}
            chunkProgress={(processedMarkers: number, totalMarkers: number, elapsedTime: number) => {
              console.log("processedMarkers: ", processedMarkers, "totalMarkers: ", totalMarkers, "elapsedTime: ", elapsedTime);
            }}
          >
            {memoizedMarkers}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}

export default memo(ClusterMap);
