import { useEffect, useMemo, useState } from "react";
import { CanisterAsset } from "../../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import AssetApi from "../../../api/assets/AssetApi";
import { ThumbnailCache } from "../../../class/Cacheing/ThumbnailCache";
import { Identity } from "@dfinity/agent";
import { FileTypeIcon } from "../FileTypeIcon/FileTypeIcon";
import "./FileCard.css";
import { useHttpAgent } from "../../../context/HttpAgentContext/HttpAgentContext";
const FileCard: React.FC<{
  asset: CanisterAsset;
  canisterId: string;
  identity: Identity | null;
}> = ({ asset, canisterId, identity }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const thumbnailCache = useMemo(() => new ThumbnailCache(), []);
  const { agent } = useHttpAgent();

  useEffect(() => {
    const loadThumbnail = async () => {
      if (!asset.content_type.startsWith("image/")) return;

      try {
        // Try to get from cache first
        let thumbnail = await thumbnailCache.get(asset.key);

        if (!thumbnail) {
          const assetApi = new AssetApi();

          if (!agent) {
            throw new Error("Agent not found");
          }

          // If not in cache, fetch from canister
          const response = await assetApi.getAsset(
            canisterId,
            asset.key,
            identity,
            agent
          );

          if (!response) {
            throw new Error("Failed to get asset");
          }

          thumbnail = new Blob([new Uint8Array(response.content)], {
            type: asset.content_type,
          });
          // Store in cache for future use
          await thumbnailCache.set(asset.key, thumbnail);
        }

        // Create URL for the thumbnail
        setThumbnailUrl(URL.createObjectURL(thumbnail));
      } catch (error) {
        console.error("Failed to load thumbnail:", error);
      }
    };

    loadThumbnail();

    // Cleanup
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [asset.key]);

  return (
    <div className="file-card">
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          className="file-preview thumbnail"
          alt={asset.key}
        />
      ) : (
        <FileTypeIcon type={asset.content_type} />
      )}
    </div>
  );
};

export default FileCard;
