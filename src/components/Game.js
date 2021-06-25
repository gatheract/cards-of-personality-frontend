import React from 'react';
import DraggableCard from './DraggableCard';
import TouchBackend from 'react-dnd-touch-backend';
import { DndProvider } from 'react-dnd';
import MyCardsDropZone from './MyCardsDropZone';
import PlayerDrop from './PlayerDrop';
import CardWrap from './CardWrap';
import BlankPlayerCard from './BlankPlayerCard';
import BlackCardDrop from './BlackCardDrop';
import NamePopup from './NamePopup';
import { ToastContainer, toast, Slide } from 'react-toastify';
import { MAX_PLAYERS } from '../constants';
import { withRouter } from 'react-router-dom';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import io from 'socket.io-client';
import axios from 'axios';
import queryString from 'query-string';
import { SERVER_URL } from '../constants';
import Tour from 'reactour';
import './Game.css';
import 'react-toastify/dist/ReactToastify.min.css';

export const BlackCard = React.memo(({ text, setUserIsDragging, socket, isMyCardsOpen, isSubmittedTableOpen }) => {
  return (
    <DraggableCard
      isFlipBroadcasted
      setUserIsDragging={setUserIsDragging}
      socket={socket}
      type="blackCard"
      bgColor="#000"
      color="#fff"
      text={text}
      screen="main"
      isMyCardsOpen={isMyCardsOpen}
      isSubmittedTableOpen={isSubmittedTableOpen}
    />
  );
});

const PickUpPile = React.memo(({ id, text, setUserIsDragging, socket, isMyCardsOpen, isSubmittedTableOpen }) => {
  return (
    <DraggableCard
      isFlippable={false}
      setUserIsDragging={setUserIsDragging}
      socket={socket}
      id={id}
      type="whiteCard"
      bgColor="#fff"
      color="#000"
      text={text}
      screen="main"
      isMyCardsOpen={isMyCardsOpen}
      isSubmittedTableOpen={isSubmittedTableOpen}
    />
  );
});

const TourToast = ({ setTourOpen }) => (
  <TourToastButton type="button" onClick={setTourOpen}>
    Tap here to learn how to play! (Recommended)
  </TourToastButton>
);

class Game extends React.PureComponent {
  socket = null;

  roomId = null;

  componentDidMount() {
    this.setState({
      cardDimensions: {
        width: this.whiteCardRef.current.offsetWidth,
        height: this.whiteCardRef.current.offsetHeight,
        top: this.whiteCardRef.current.getBoundingClientRect().top,
        left: this.whiteCardRef.current.getBoundingClientRect().left,
      },
    });

    this.props.reactGA.pageview('/g');

    if (!this.socket) {
      // start socket connection
      this.socket = io(SERVER_URL);

      // set the roomId based on the /g/:roomId path
      this.roomId = this.props.location.pathname.replace('/g/', '');

      // let the server know we've joined a room
      this.socket.emit('join room', {
        roomId: this.roomId,
        myName: this.state.myName,
      });

      // confirm that we've joined the right room on the client
      this.socket.on('joined a room', (theRoom) => {
        console.log({ theRoom });

        // once we've joined a room, lets get the cards
        const deckQueryString = queryString.parse(this.props.location.search)
          .deck;

        // If the whiteCards and blackCards are already set, don't bother hitting this endpoint.
        if (!this.state.whiteCards.length && !this.state.blackCards.length) {
          axios
            .post(`${SERVER_URL}/api/getInitialCards`, {
              deckName: deckQueryString,
              roomId: this.roomId,
            })
            .then((res) => {
              if (!res.data) {
                return;
              }

              const {
                blackCards: newBlackCards,
                whiteCards: newWhiteCards,
              } = res.data;

              this.socket.emit('set initialCards for game', {
                whiteCards: newWhiteCards,
                blackCards: newBlackCards,
              });
            });

          // check if the room is marked as private by the first user to connect
          const isPrivate = queryString.parse(this.props.location.search)
            .private;

          if (isPrivate === '1') {
            this.socket.emit('set game as private');
          }
        }
      });

      const newPlayers = [...this.state.players, { socket: null }];

      this.setState({
        players: newPlayers,
      });
    }

    this.socket.on(
      'get initialCards for game',
      ({ whiteCards = [], blackCards = [] }) => {
        this.setState({
          whiteCards,
          blackCards,
        });
      }
    );

    this.socket.on('disconnect', () => {
      // @TODO: find a better way to reconnect or recreate the room
      // after the server restarts or a long period of time and someone tries to reconnect.
      // when the server no longer has any knowledge of the room
      window.location.reload();
    });

    // when a player changes their name, update players state with new name
    this.socket.on('name change', (players) => {
      console.log({ players });
      this.setState({ players });
    });

    // when a player disconnects from the server, remove them from state
    this.socket.on('user disconnected', (players) => {
      this.setState({ players });
    });

    // when a new user connects
    // send that specific user the latest server states
    this.socket.on(
      'new connection',
      ({ players, blackCards, whiteCards, submittedCards, socketId }) => {
        if (whiteCards && whiteCards.length > 0) {
          this.setState({ whiteCards });
        }

        if (blackCards && blackCards.length > 0) {
          this.setState({ blackCards });
        }

        if (submittedCards && submittedCards.length > 0) {
          this.setState({ submittedCards });
        }

        console.log('new connection!', players);

        this.setState(() => ({
          players,
          socketConnected: true,
        }));
      }
    );

    // when a new user connects, let every client know.
    this.socket.on('user connected', ({ players }) => {
      this.setState({ players });
    });

    this.socket.on('dropped in my cards', ({ players, whiteCards }) => {
      this.setState({ whiteCards, players });
    });

    this.socket.on('update players', (players) => {
      this.setState({ players });
    });

    this.socket.on('update submittedCards', (submittedCards) => {
      this.setState({ submittedCards });
    });

    this.socket.on('submitted a card', ({ submittedCards, players }) => {
      this.setState({ submittedCards, players });
    });

    this.socket.on('player rejoins', (players) => {
      const playerWithWhiteCards = players.find(
        (player) => this.socket.id === player.id
      );
      if (playerWithWhiteCards.whiteCards) {
        this.setState({ myCards: playerWithWhiteCards.whiteCards });
      }

      this.setState({ players });
    });

    this.socket.on('dropped in player drop', ({ players, blackCards }) => {
      this.setState({ players, blackCards });
    });

    this.socket.on(
      'draw seven white cards update',
      ({ players, whiteCards, sevenWhiteCards, socketId }) => {
        this.setState({
          players,
          whiteCards,
        });

        if (this.socket.id === socketId) {
          this.setState({
            myCards: sevenWhiteCards,
          });
        }
      }
    );
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.players !== this.state.players) {
      const lengths = this.state.players.map((player) =>
        player.blackCards ? player.blackCards.length : -1
      );
      const winner = Math.max(...lengths);
      const numberOfWinners = lengths.filter((length) => length === winner)
        .length;
      const index = this.state.players.findIndex(
        (player) => player.blackCards && player.blackCards.length === winner
      );
      if (winner === 0 || numberOfWinners > 1) {
        return this.setState({ winningPlayerIndex: -1 });
      }
      this.setState({ winningPlayerIndex: index });
    }
    if (prevState.animationOver !== this.state.animationOver) {
      if (this.state.animationOver) {
        toast.success(<TourToast setTourOpen={this.setTourOpen} />, {
          toastId: 'TourToast',
          position: toast.POSITION.TOP_CENTER,
          autoClose: false,
        });
      }
    }
  }

  componentWillUnmount() {
    this.socket.off('get initialCards for game');
    this.socket.off('disconnect');
    this.socket.off('name change');
    this.socket.off('user disconnected');
    this.socket.off('new connection');
    this.socket.off('user connected');
    this.socket.off('dropped in my cards');
    this.socket.off('update players');
    this.socket.off('update submittedCards');
    this.socket.off('submitted a card');
    this.socket.off('player rejoins');
    this.socket.off('dropped in player drop');
    this.socket.off('draw seven white cards update');
    this.socket.off('joined a room');
  }

  state = {
    blackCardWidth: null,
    blackCards: [],
    whiteCards: [],
    myCards: [],
    myName: localStorage.getItem('cas-name') || '',
    players: [],
    submittedCards: [],
    currentHost: 0,
    showNamePopup: true,
    userIsDragging: null,
    nameError: '',
    winningPlayerIndex: -1,
    socketConnected: false,
    chatOpen: false,
    unreadCount: 0,
    animationOver: false,
    isTourOpen: false,
    isMyCardsOpen: false,
    isSubmittedTableOpen: false,
  };

  whiteCardRef = React.createRef();

  getTheCurrentHost = (index) => this.setState({ currentHost: index });

  addCardToPlayer = (passedInCard, playerDroppedOn) => {
    if (!this.state.userIsDragging) {
      return;
    }

    // get the players state, the player index, and give that the passedInCard (players[index].blackCards.push(passedInCard))
    this.setState(
      (prevState) => {
        // update player card property with new card
        const newPlayers = [...prevState.players].map((player) => {
          if (player.id === playerDroppedOn.id) {
            if (
              playerDroppedOn.blackCards &&
              playerDroppedOn.blackCards.length
            ) {
              // check if blackCard already exists with player
              if (
                !player.blackCards.some(
                  (blackCard) => blackCard.text === passedInCard.text
                )
              ) {
                player.blackCards = [...player.blackCards, { ...passedInCard }];
              }
            } else {
              player.blackCards = [{ ...passedInCard }];
            }
          } else {
            if (player.blackCards) {
              // if another player already has the blackCard, remove it from them
              player.blackCards = player.blackCards.filter((blackCard) => {
                return blackCard.text !== passedInCard.text;
              });
            }
          }
          return player;
        });

        // remove blackcard from blackcards if this is from the main deck
        // and not from another player slot ('blackCardFromPlayer')
        if (passedInCard.type === 'blackCard') {
          const indexOfPassedInCard = prevState.blackCards.findIndex(
            (blackCard) => blackCard === passedInCard.text
          );
          const newBlackCards = [...prevState.blackCards];
          newBlackCards.splice(indexOfPassedInCard, 1);

          return {
            players: newPlayers,
            blackCards: newBlackCards,
          };
        }

        return {
          players: newPlayers,
        };
      },
      () => {
        // send event that a card was moved to someones deck to the server
        this.socket.emit('dropped in player drop', {
          players: this.state.players,
          blackCards: this.state.blackCards,
        });
      }
    );
  };

  addCardToMyCards = (passedInCard) => {
    if (this.state.myCards.length === 7 || !this.state.userIsDragging) {
      return;
    }

    this.setState((prevState) => ({
      myCards: [...prevState.myCards, passedInCard],
    }));

    // send event that a card was moved to someones deck to the server
    this.socket.emit('dropped in my cards', {
      passedInCard,
      socketId: this.socket.id,
    });
  };

  addBlackCardBackToPile = (passedInCard) => {
    if (!this.state.userIsDragging) {
      return;
    }
    // add passedInCard to the front of the blackCards array
    const newBlackCards = [...this.state.blackCards];
    newBlackCards.unshift(passedInCard);

    // find player with blackCard and remove from their blackCards array
    const newPlayers = this.state.players.map((player) => {
      if (player.blackCards && player.blackCards.length) {
        const newPlayerBlackCards = player.blackCards.filter((blackCard) => {
          return blackCard.text !== passedInCard.text;
        });

        return { ...player, blackCards: newPlayerBlackCards };
      }

      return player;
    });

    this.setState({
      blackCards: newBlackCards,
      players: newPlayers,
    });

    // update blackCards for everyone
    this.socket.emit('dropped in player drop', {
      blackCards: newBlackCards,
      players: newPlayers,
    });
  };

  submitACard = (passedInCard) => {
    if (this.state.submittedCards.length === MAX_PLAYERS - 1) {
      return;
    }

    // remove passedInCard from myCards
    const passedInCardIndex = this.state.myCards.findIndex(
      (card) => card.text === passedInCard.text
    );
    const newMyCards = [...this.state.myCards];
    newMyCards.splice(passedInCardIndex, 1);

    // update players and myCards
    this.setState({
      myCards: newMyCards,
    });

    this.props.reactGA.event({
      category: `Game ${this.roomId}`,
      action: 'Player submitted a card',
      label: passedInCard.text,
    });

    this.socket.emit('submitted a card', {
      socketId: this.socket.id,
      passedInCard,
      newMyCards,
    });
  };

  discardACard = (passedInCard) => {
    if (!this.state.userIsDragging) {
      return;
    }

    this.socket.emit('update submittedCards', passedInCard);
  };

  getBlankPlayerCards(players) {
    const length = MAX_PLAYERS - players.length;
    const arr = Array.from({ length }, (_, i) => i);

    return arr;
  }

  updateMyName = (e) => {
    const myName = e.target.value.toUpperCase().trim();
    this.setState({ myName });

    // send event that a user just changed their name
    this.socket.emit('name change', { id: this.socket.id, name: myName });
  };

  handleSubmit = (e) => {
    e.preventDefault();

    if (!this.socket.connected) {
      this.setState({ nameError: 'Cannot connect to server. Try again.' });
      return;
    }
    if (this.state.myName.trim().length < 2) {
      this.setState({
        nameError: 'Please submit a name at least 2 characters long.',
      });
      return;
    }
    // This handles a case for slower connections so users cannot
    // enter the game and do stuff before the socket is connected
    if (!this.state.socketConnected) {
      this.setState({
        nameError: 'Please try again in a few seconds.',
      });
      return;
    }

    if (
      this.state.players.find(
        (player) =>
          player.name === this.state.myName && player.id !== this.socket.id
      )
    ) {
      this.setState({ nameError: 'Name taken. Please choose another name.' });
      return;
    }

    const doesPlayerExist = this.state.players.find(
      (player) => player.id === this.socket.id
    );

    // not sure the main cause, but hoping this prevents
    // users from entering the game without being set up as a player.
    if (!doesPlayerExist) {
      this.setState({
        nameError:
          'Looks like you were disconnected. \nPlease refresh the page.',
      });
      return;
    }

    localStorage.setItem('cas-name', this.state.myName);
    this.setState((prevState) => {
      // once we update our name, let's update our player in players
      const newPlayers = prevState.players.map((player) => {
        if (player.id === this.socket.id) {
          const newPlayer = { ...player };
          newPlayer.name = this.state.myName;
          return newPlayer;
        }
        return player;
      });

      // and then let the other clients know
      this.socket.emit('name submit', {
        players: newPlayers,
        myName: this.state.myName,
        id: this.socket.id,
      });

      this.props.reactGA.event({
        category: `Game ${this.roomId}`,
        action: 'Submitted A Name',
        label: this.state.myName,
      });

      return {
        showNamePopup: false,
        players: newPlayers,
        nameError: '',
      };
    });
  };

  setUserIsDragging = (type) => {
    this.setState({ userIsDragging: type });
  };

  copyLink = () => {
    // Web Share API for cool browsers
    // @TODO: This is crashing chrome for some reason
    // if (navigator && navigator.share) {
    //   navigator
    //     .share({
    //       title: "Cards of Personality Game",
    //       url: this.inviteInputRef.current,
    //     })
    //     .then(() => {
    //       console.log("Thanks for sharing!");
    //     })
    //     .catch(console.error);
    // }

    // Generic copy to clipboard
    this.inviteInputRef.current.select();
    document.execCommand('copy');

    // Clear the text selection
    if (window.getSelection) {
      if (window.getSelection().empty) {
        // Chrome
        window.getSelection().empty();
      } else if (window.getSelection().removeAllRanges) {
        // Firefox
        window.getSelection().removeAllRanges();
      }
    } else if (document.selection) {
      // IE?
      document.selection.empty();
    }

    // Pop a success toast
    toast.success('Copied to clipboard!', {
      toastId: 'copy-toast',
      position: toast.POSITION.TOP_CENTER,
      autoClose: 2000,
    });
  };

  inviteInputRef = React.createRef();

  setChatOpen = (bool) => {
    this.setState({ chatOpen: bool });
  };

  setUnreadCount = (count) => {
    if (count) {
      this.setState((prevState) => ({
        unreadCount: prevState.unreadCount + 1,
      }));
      return;
    }

    this.setState({ unreadCount: 0 });
  };

  setAnimationOver = () => {
    this.setState({
      animationOver: true,
    });
  };

  setTourOpen = () => {
    this.setState({
      isTourOpen: true,
    });
  };

  setTourClosed = () => {
    this.setState({
      isTourOpen: false,
      isSubmittedTableOpen: false,
      isMyCardsOpen: false,
    });
  };

  setMyCardsOpen = (bool) => {
    if (bool && typeof bool === 'boolean') {
      return this.setState({
        isMyCardsOpen: bool,
      });
    }
    this.setState((prevState) => ({
      isMyCardsOpen: !prevState.isMyCardsOpen,
    }));
  };

  setSubmittedTableOpen = (bool) => {
    if (bool && typeof bool === 'boolean') {
      return this.setState({
        isSubmittedTableOpen: bool,
      });
    }
    this.setState((prevState) => ({
      isSubmittedTableOpen: !prevState.isSubmittedTableOpen,
    }));
  };

  // Tutorial Overlay Steps
  getSteps = () => {
    return [
      {
        selector: '.Game-bigBlackCard',
        content:
          'To start, the first player to join is the judge and begins the round by tapping the black card and reading it aloud.',
        position: 'left',
        action: () => {
          if (this.state.isMyCardsOpen) {
            this.setMyCardsOpen(false);
          }
          if (this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(false);
          }
        },
      },
      {
        selector: '.MyCardsDropBar',
        content:
          'Each player looks at their seven white cards by tapping this bar.',
        action: () => {
          if (this.state.isMyCardsOpen) {
            this.setMyCardsOpen(false);
          }
          if (this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(false);
          }
        },
      },
      {
        selector: '.MyCardsContainer-scrollingWrap',
        content:
          'Each player except the judge submits a single white card that makes the funniest play with the black card.',
        action: () => {
          if (!this.state.isMyCardsOpen) {
            this.setMyCardsOpen(true);
          }
          if (this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(false);
          }
        },
      },
      {
        selector: '.SubmittedCardsBar',
        content:
          'Submit your card by dragging it and dropping it on the bottom bar. Tap the bottom bar to proceed to the Submitted Cards screen.',
        action: () => {
          if (!this.state.isMyCardsOpen) {
            this.setMyCardsOpen(true);
          }
          if (this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(false);
          }
        },
      },
      {
        selector: '.SubmittedCardsTable-scrollingWrap',
        content:
          'Once everyone has submitted a card, the judge re-reads the black card and taps to flip each submitted white card one by one to read aloud for all to admire or condemn.',
        action: () => {
          if (this.state.isMyCardsOpen) {
            this.setMyCardsOpen(false);
          }
          if (!this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(true);
          }
        },
      },
      {
        selector: '.DiscardButton',
        content:
          'The judge announces a winner and now everyone can discard their submitted card by dragging it to the bottom bar.',
        action: () => {
          if (this.state.isMyCardsOpen) {
            this.setMyCardsOpen(false);
          }
          if (!this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(true);
          }
        },
      },
      {
        selector: '.PlayerOneSlot',
        content:
          'The player who submitted the winning card can now drag the big black card to their player slot. The first player to collect 7 black cards in their player slot wins.',
        action: () => {
          if (this.state.isMyCardsOpen) {
            this.setMyCardsOpen(false);
          }
          if (this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(false);
          }
        },
      },
      {
        selector: '.PlayerTwoSlot',
        content:
          'The next player is now the judge and proceeds to flip the next black card.',
        action: () => {
          if (this.state.isMyCardsOpen) {
            this.setMyCardsOpen(false);
          }
          if (this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(false);
          }
        },
      },
      {
        selector: '.WhiteCardPile',
        content:
          'Don\'t forget to drag another white card to your deck after each round. A player can have up to 7 white cards in their deck at all times!',
        action: () => {
          if (this.state.isMyCardsOpen) {
            this.setMyCardsOpen(false);
          }
          if (this.state.isSubmittedTableOpen) {
            this.setSubmittedTableOpen(false);
          }
        },
      },
    ];
  };

  render() {
    return (
      <>
        <div className={`Game ${this.state.isTourOpen ? 'is-tourActive' : ''}`}>
          <GlobalStyle />
          {this.state.showNamePopup && (
            <NamePopup
              handleSubmit={this.handleSubmit}
              inviteInputRef={this.inviteInputRef}
              roomId={this.roomId}
              copyLink={this.copyLink}
              updateMyName={this.updateMyName}
              myName={this.state.myName}
              nameError={this.state.nameError}
              reactGA={this.props.reactGA}
            />
          )}
          <DndProvider
            backend={TouchBackend}
            options={{ enableMouseEvents: true }}
          >
            <Table>
              <CardsWrap>
                <Piles>
                  <CardWrap isPickUpPile className="Game-bigBlackCard">
                    <BlackCardDrop
                      addBlackCardBackToPile={this.addBlackCardBackToPile}
                    >
                      {this.state.blackCards
                        .slice(
                          Math.max(
                            this.state.blackCards.length - (MAX_PLAYERS + 1),
                            0
                          )
                        )
                        .map((text, index) => (
                          <BlackCard
                            setUserIsDragging={this.setUserIsDragging}
                            key={text}
                            id={index}
                            text={text}
                            socket={this.socket}
                            isMyCardsOpen={this.state.isMyCardsOpen}
                            isSubmittedTableOpen={this.state.isSubmittedTableOpen}
                          />
                        ))}
                    </BlackCardDrop>
                  </CardWrap>
                  <CardWrap isPickUpPile innerRef={this.whiteCardRef} className="WhiteCardPile">
                    {this.state.whiteCards
                      .slice(
                        Math.max(
                          this.state.whiteCards.length - (MAX_PLAYERS + 1),
                          0
                        )
                      )
                      .map((text, index) => (
                        <PickUpPile
                          setUserIsDragging={this.setUserIsDragging}
                          key={text}
                          id={index}
                          text={text}
                          socket={this.socket}
                          isMyCardsOpen={this.state.isMyCardsOpen}
                          isSubmittedTableOpen={this.state.isSubmittedTableOpen}
                        />
                      ))}
                    {!this.state.showNamePopup &&
                      this.state.myCards.length > 0 &&
                      !this.state.animationOver && (
                        <AnimatedDraw
                          cardDimensions={this.state.cardDimensions}
                          myCards={this.state.myCards}
                          onAnimationEnd={this.setAnimationOver}
                        >
                          <DraggableCard
                            bgColor="#fff"
                            isBroadcastingDrag={false}
                            isFlipBroadcasted={false}
                            color="#000"
                            type="whiteCard"
                            setUserIsDragging={this.setUserIsDragging}
                            isFlippable={false}
                          />
                        </AnimatedDraw>
                      )}
                  </CardWrap>
                </Piles>
                <PlayerDecks className="Table-playerDecks">
                  {this.state.players &&
                    this.state.players.map(({ name }, index) => (
                      <PlayerDrop
                        className={index === 0 ? 'PlayerOneSlot' : index === 1 ? 'PlayerTwoSlot' : ''}
                        setUserIsDragging={this.setUserIsDragging}
                        userIsDragging={this.state.userIsDragging}
                        key={index}
                        index={index}
                        socket={this.socket}
                        addCardToPlayer={this.addCardToPlayer}
                        players={this.state.players}
                        myName={this.state.myName}
                        winningPlayerIndex={this.state.winningPlayerIndex}
                        isMyCardsOpen={this.state.isMyCardsOpen}
                        isSubmittedTableOpen={this.state.isSubmittedTableOpen}
                      />
                    ))}
                  {this.getBlankPlayerCards(this.state.players).map(
                    (num, index) => (
                      <BlankPlayerCard
                        className={this.state.players && this.state.players.length === 1 && index === 0 ? 'PlayerTwoSlot' : ''}
                        key={num}
                        index={index}
                        count={this.state.players.length}
                      />
                    )
                  )}
                </PlayerDecks>
              </CardsWrap>
              <MyCardsDropZone
                setUserIsDragging={this.setUserIsDragging}
                blackCards={this.state.blackCards}
                userIsDragging={this.state.userIsDragging}
                socket={this.socket}
                discardACard={this.discardACard}
                addCardToMyCards={this.addCardToMyCards}
                submitACard={this.submitACard}
                submittedCards={this.state.submittedCards}
                myCards={this.state.myCards}
                myName={this.state.myName}
                setChatOpen={this.setChatOpen}
                unreadCount={this.state.unreadCount}
                setMyCardsOpen={this.setMyCardsOpen}
                setSubmittedTableOpen={this.setSubmittedTableOpen}
                isMyCardsOpen={this.state.isMyCardsOpen}
                isSubmittedTableOpen={this.state.isSubmittedTableOpen}
              />
            </Table>
          </DndProvider>
          <ToastContainer
            limit={1}
            hideProgressBar
            closeOnClick
            transition={Slide}
            pauseOnFocusLoss={false}
          />
        </div>
        <Tour
          steps={this.getSteps()}
          closeWithMask={false}
          isOpen={this.state.isTourOpen}
          onRequestClose={this.setTourClosed}
          highlightedMaskClassName="is-highlighted"
          maskClassName="MaskOverlay"
          rounded={8}
          accentColor="#2cce9f"
          lastStepNextButton={<DoneButton type="button">Got it!</DoneButton>}
        />
      </>
    );
  }
}

const GlobalStyle = createGlobalStyle`
  html {
    overflow: hidden;
    position: fixed;
    width: 100%;
  }
  body {
    height: 100%;
    background: #dcdbdb;
    border: 0;
    padding: 0;
  }
  .Toastify__toast--success {
    background: #2cce9f;
    border-radius: 8px;
    color: #000;
    max-width: 200px;
    margin: 1em auto;
    font: inherit;
  }
  .Toastify__close-button {
    color: #000;
  }
`;

const TourToastButton = styled.button`
  appearance: none;
  background: transparent;
  border: 0;

  &:focus {
    outline: 0;
  }
`;

const DoneButton = styled.button`
  appearance: none;
  background: #2cce9f;
  border: 0;
  border-radius: 8px;
  padding: .5em;

  &:focus {
    outline: 0;
  }
  &:hover,
  &:focus {
    opacity: .5;
  }
`;

const moveToBottom = (cardDimensions) => keyframes`
  0% {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
  99% {
    opacity: 1;
  }
  100% {
    transform: translate3d(calc(${
  window ? `${window.innerWidth / 2 - 25}px` : 0
  } - ${cardDimensions?.left}px - 50%), calc(${
  window ? `${window.innerHeight - 25}px` : 0
  } - ${cardDimensions?.top}px - 50%), 0);
    opacity: 0;
  }
`;
const AnimatedDraw = styled.div`
  position: fixed;
  pointer-events: none;
  z-index: 999;
  animation: 0.2s ${(props) => moveToBottom(props.cardDimensions)} ease-out
    ${(props) => props.myCards.length || 7} forwards;
  width: ${(props) =>
    props.cardDimensions.width ? `${props.cardDimensions.width}px` : 0};
  height: ${(props) =>
    props.cardDimensions.height ? `${props.cardDimensions.height}px` : 0};
`;

const Table = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Piles = styled.div`
  display: flex;
  width: calc(40% - 0.25em);
  justify-content: center;
  align-items: center;

  > div:first-child {
    margin-right: 1em;
  }

  @media (min-width: 1600px) {
    margin-right: 2em;
  }
  @media (max-width: 500px) and (orientation: portrait) {
    width: 100%;
    margin: 0.5em 0;
    order: 1;
  }
`;

const PlayerDecks = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: calc(60% - 0.25em);
  justify-content: center;
  align-content: center;
  margin-right: -0.5em;
  font-size: 0.7rem;

  /*
    some devices with small viewport height like Moto G2
    need to make the player slots smaller.
    they can take up full space at this height
  */
  @media (min-height: 556px) {
    justify-content: center;
  }
  @media (max-width: 500px) and (orientation: portrait) {
    width: calc(100% + 1em);
    margin: 0.5em -0.5em 0.5em;
  }
`;

const CardsWrap = styled.div`
  display: flex;
  flex-grow: 1;
  padding: 1em;
  justify-content: space-between;
  max-height: calc(100vh - 50px);

  @media (min-width: 1600px) {
    padding: 0;
  }

  @media (max-width: 500px) and (orientation: portrait) {
    max-height: none;
    margin-bottom: 50px;
    flex-direction: column;
    width: 100%;
    justify-content: center;
  }
`;

export default withRouter(Game);
