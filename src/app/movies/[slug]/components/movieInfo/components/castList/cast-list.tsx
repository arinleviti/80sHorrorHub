"use client";

import { useState } from "react";
import Image from "next/image";
import { TMDBImageConfig } from "@/app/services/tmdb";
import { ListGroup,  Stack } from "react-bootstrap";
import style from "./cast-list.module.css";

export interface CastMember {
  actorName: string;
  character: string;
  profile_path?: string | null;
  imagekitProfilePath?: string | null;
}

interface CastListProps {
  cast: CastMember[];
  config: TMDBImageConfig;
}

export default function CastList({ cast, config }: CastListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!cast || cast.length === 0) {
    return <p className="text-muted-custom">No cast information available</p>;
  }

  const mobileLimit = 4;
  const desktopLimit = 5;

  const visibleCast = expanded ? cast : cast.slice(0, desktopLimit);
  const mobileCast = expanded ? cast : cast.slice(0, mobileLimit);

  return (
    <Stack gap={3}>
      <h2 className="heading-secondary">Cast</h2>

      {/* Mobile grid */}
      <div className={style.castMobileWrapper}>
        <div className={style.castGrid}>
          {mobileCast.map((member, index) => (
            <div key={`mob-${member.actorName}-${index}`} className={style.castCard}>
              {member.profile_path ? (
                <div className={style.castImgWrapper}>
                  <Image
                    src={member.imagekitProfilePath ?? `${config.secure_base_url}w185${member.profile_path}`}
                    alt={member.actorName}
                    width={50}
                    height={70}
                    className={style.castImg}
                  />
                </div>
              ) : (
                <div className="placeholder-img" />
              )}
              <span>
                <strong className="text-accent">{member.character}</strong>:{" "}
                <span className="text-accent">{member.actorName}</span>
              </span>
            </div>
          ))}
        </div>
        {/* Mobile toggle button */}
      <div className={style.castGridToggle}>
        {cast.length > mobileLimit && (
         <div className={style.castToggleWrapper}>
            <button className={style.castToggleBtn} onClick={() => setExpanded((prev) => !prev)}>
              {expanded ? "Show less" : `Show all (${cast.length})`}
            </button>
          </div>
        )}
      </div>
      </div>
      

      {/* Desktop list */}
      <ListGroup variant="flush" className={style.castList}>
        {visibleCast.map((member, index) => (
          <ListGroup.Item
            key={`desk-${member.actorName}-${index}`}
            className="d-flex align-items-center gap-2"
          >
            {member.profile_path ? (
              <div className={style.castImgWrapper}>
                <Image
                  src={member.imagekitProfilePath ?? `${config.secure_base_url}w185${member.profile_path}`}
                  alt={member.actorName}
                  width={50}
                  height={70}
                  className={style.castImg}
                />
              </div>
            ) : (
              <div className="placeholder-img" />
            )}
            <span>
              <strong className="text-accent">{member.character}</strong>:{" "}
              <span className="text-accent">{member.actorName}</span>
            </span>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {/* Desktop toggle button */}
      <div className={style.castListToggle}>
        {cast.length > 10 && (
          <div className={style.castListToggle}>
          <button className={style.castToggleBtn} onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? "Show less" : `Show all (${cast.length})`}
          </button>
        </div>
        )}
      </div>
    </Stack>
  );
}