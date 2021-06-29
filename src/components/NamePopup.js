import React, { useState } from "react";
import { CLIENT_URL } from "../constants";
import { CopyIcon } from "../icons";
import HowToPlay from "./HowToPlay";
import styled from "styled-components";

const NamePopup = ({
  handleSubmit,
  inviteInputRef,
  roomId,
  copyLink,
  updateMyName,
  myName,
  nameError,
  reactGA,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const PopupElement = isVisible ? HelpPopup : Popup;

  return (
    <PopupElement>
      {isVisible ? (
        <HowToPlay setIsVisible={setIsVisible} />
      ) : (
        <>
          <form onSubmit={(e) => handleSubmit(e)}>
            <PopupInnerWrap>
              <NameLabel htmlFor="name">Enter your name</NameLabel>
              <NameInput
                type="text"
                id="name"
                maxLength="16"
                onChange={(e) => updateMyName(e)}
                defaultValue={myName}
              />
              {nameError && <ErrorMsg>{nameError}</ErrorMsg>}
              <JoinGameButton type="submit">JOIN GAME</JoinGameButton>
            </PopupInnerWrap>
          </form>
        </>
      )}
    </PopupElement>
  );
};

const Popup = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background 0.25s;
`;

const HelpPopup = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  color: #fff;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background 0.25s;
`;

const PopupInnerWrap = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 218px;
`;

const ErrorMsg = styled.p`
  margin-top: 0;
  color: #cc2e2e;
`;

const IconWrap = styled.button`
  appearance: none;
  background: #2cce9f;
  color: #000;
  font-size: 1em;
  border: 0;
  padding: 0.7em 1em;
  border-radius: 0 8px 8px 0;
  margin: 0 auto;
  transition: opacity 0.25s;

  &:hover,
  &:focus {
    opacity: 0.5;
  }
  &:focus {
    outline: 0;
    border-color: #2cce9f;
  }
  & svg {
    display: block;
  }
`;

const Flex = styled.div`
  display: flex;
  margin-bottom: 2em;
  border-radius: 8px;
`;

const NameInput = styled.input`
  appearance: none;
  font-size: 1em;
  border: 0;
  margin: 0 0 1em;
  padding: 0.25em 0 0.5em;
  background: transparent;
  border-bottom: 1px solid white;
  color: #fff;
  transition: border-color 0.25s;
  border-radius: 0;

  &:focus {
    outline: 0;
    border-color: #2cce9f;
  }
`;

const NameLabel = styled.label`
  text-align: left;
  text-transform: uppercase;
  font-size: 0.813em;
  color: #c1bdbd;
`;

const InviteInput = styled.input`
  appearance: none;
  font-size: 1em;
  border: 0;
  background: white;
  border-radius: 8px 0 0 8px;
  color: #000;
  padding: 0.25em 0.5em;
  margin: 0;
  direction: rtl;

  &:focus {
    outline: 0;
    border-color: #2cce9f;
  }
`;

const InviteLabel = styled.label`
  text-align: left;
  text-transform: uppercase;
  font-size: 0.813em;
  color: #c1bdbd;
  margin-bottom: 0.5em;
`;

const JoinGameButton = styled.button`
  appearance: none;
  background: #2cce9f;
  color: #000;
  font-size: 1em;
  border: 0;
  padding: 0.7em 1em;
  border-radius: 8px;
  margin: 0 auto;
  transition: opacity 0.25s;

  &:hover,
  &:focus {
    opacity: 0.5;
  }
  &:focus {
    outline: 0;
    border-color: #2cce9f;
  }
`;

export default NamePopup;
