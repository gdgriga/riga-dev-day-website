var ScheduleRoomNames = React.createClass({
    displayName: 'ScheduleRoomNames',
    render: function () {
        var roomNameNodes = [];
        roomNameNodes.push(React.createElement("th", {key: "-2"})); // Cell for time
        roomNameNodes.push(React.createElement("th", {key: "-1"})); // Cell for icon
        this.props.roomNames.forEach(function (name, i) {
            roomNameNodes.push(React.createElement("th", {key: i}, name));
        });
        return React.createElement("tr", null, roomNameNodes);
    }
});

var Timeline = React.createClass({displayName: "Timeline",
    collectSpeakerNames: function (speakerIds) {
        var speakerNames = [];
        speakerIds.forEach(function (speakerId) {
            speakerNames.push(this.props.speakers[speakerId].name);
        }.bind(this));

        return speakerNames.join(", <br />");
    },
    getEventCellClassName: function (clickable, event, selectedTags) {
        var className = (clickable ? "clickable" : "unique") + " content";

        var hasSelectedTag = false;
        if (event.tags && event.tags.length > 0) {
            event.tags.forEach(function (tag) {
                if (selectedTags[tag] === true) hasSelectedTag = true;
            }.bind(this));
        }

        if (hasSelectedTag) className += " selected-tag";
        return className;
    },
    getEventCellSize: function (single) {
        return single ? "5" : "1";
    },
    getEventHeader: function (event) {
        return event.title ? event.title : this.collectSpeakerNames(event.speakers);
    },
    getEventSubtitle: function (event) {
        return event.subtitle ? event.subtitle : "";
    },
    getEventId: function (i) {
        return this.props.timelineId + "#" + i;
    },
    getEventTags: function (event, selectedTags) {
        if (event.tags && event.tags.length > 0) {
            return event.tags.map(function (tag, i) {
                // TODO: move tag logic
                return (
                    React.createElement("a", {
                        className: (selectedTags[tag] === true ? "selected-tag " : " ") + this.props.tagColorMap[tag], 
                        onClick: this.handleTagSelect.bind(this, tag), key: i}, tag
                    )
                );
            }, this);
        } else {
            return "";
        }
    },
    getEventIsFavorite: function (i) {
        var key = "favorites-" + this.getEventId(i);

        return simpleStorage.get(key) || false;
    },
    handleTagSelect: function (tag) {
        this.props.handleTagSelect(tag);
    },
    handleFavorites: function (i) {
        var key = "favorites-" + this.getEventId(i);
        var isFavorite = simpleStorage.get(key) || false;

        simpleStorage.set(key, !isFavorite);
        this.setState({});
    },
    render: function () {
        var single = this.props.timeline.events.length == 1;
        var clickable = !!this.props.timeline.events[0].speakers;

        var timelineNodes = this.props.timeline.events.map(function (event, i) {
            var cellClassName = this.getEventCellClassName(clickable, event, this.props.selectedTags);
            var cellColSpan = this.getEventCellSize(single);
            var eventHeader = this.getEventHeader(event);
            var eventSubtitle = this.getEventSubtitle(event);
            var eventId = this.getEventId(i);
            var eventTags = this.getEventTags(event, this.props.selectedTags);
            var eventFavorite = this.getEventIsFavorite(i);
            var slides = null;
            if(event.slides) {
                slides = React.createElement("a", {href: event.slides, target: "_blank"}, "slides");
            }

            var favoritesTag = null;
            if (clickable) {
                favoritesTag = (
                    React.createElement("div", {className: eventFavorite ? "favorite selected" : "favorite unselected"}, 
                        React.createElement("i", {className: "fa fa-star", onClick: this.handleFavorites.bind(this, i)})
                    )
                );
            }
            return (
                React.createElement("td", {className: cellClassName, colSpan: cellColSpan, key: i, "data-event-id": eventId}, 
                    favoritesTag, 
                    React.createElement("div", {className: "main"}, 
                        React.createElement("header", {dangerouslySetInnerHTML: {__html: eventHeader}}), 
                        React.createElement("div", {className: "desc"}, eventSubtitle)
                    ), 
                    React.createElement("div", {className: "tags"}, eventTags), 
                    React.createElement("div", {className: "slides"}, slides)
                )
            );
        }, this);

        return (
            React.createElement("tr", {className: this.props.timeline.color}, 
                React.createElement("td", {className: "time", key: "time"}, this.props.timeline.time), 
                React.createElement("td", {className: this.props.timeline.icon + " icon", key: "icon"}, 
                    React.createElement("div", null)
                ), 
                timelineNodes
            )
        );
    }
});

var TimelineList = React.createClass({displayName: "TimelineList",
    getInitialState: function () {
        return {
            selectedTags: simpleStorage.get('scheduleSelectedTags') || {}
        };
    },
    handleTagSelect: function (tag) {
        var newState = this.state;
        newState.selectedTags[tag] = !this.state.selectedTags[tag];
        this.setState(newState, function () {
            simpleStorage.set('scheduleSelectedTags', this.state.selectedTags);
        }.bind(this));
    },
    getEvent: function (eventId) {
        var eventIdParts = eventId.split("#");
        var timelinePosition = eventIdParts[0];
        var eventPosition = eventIdParts[1];

        return this.props.timelines[timelinePosition].events[eventPosition];
    },
    getSpeakers: function (speakersIds) {
        var self = this;
        var speakers = [];

        function getSpeaker(speakerId) {
            speakers.push(self.props.speakers[speakerId]);
        }

        speakersIds.forEach(getSpeaker);
        return speakers;
    },
    buildSpeakerHTMLs: function (speakers) {
        var results = [];

        function buildSpeaker(speaker) {
            var output = '<li>';
            output += '<div class="name">' + speaker.name + '</div>';
            output += '<div class="photo"><img src="assets/img/speaker-photos/' + speaker.id + '.png"></div>';
            if (speaker.contacts.twitter) {
                output += '<div class="twitter"> <a href="https://twitter.com/' + speaker.contacts.twitter + '" class="twitter-follow-button" data-show-count="true" data-show-screen-name="false" data-lang="en">Follow @twitterapi</a></div>';
            }
            output += '</li>';
            results.push(output);
        }

        speakers.forEach(buildSpeaker);
        return results;
    },
    componentDidMount: function () {
        var self = this;
        $(this.getDOMNode()).on("click", "td.clickable .main", function () {
            var eventId = $(this).parent().data('event-id');
            var event = self.getEvent(eventId);
            var speakers = self.getSpeakers(event.speakers);

            var $schedulePopup = $("#schedule-popup");
            $schedulePopup.find(".close").click($.modal.close);

            $schedulePopup.find('.speakers').html('');
            $schedulePopup.find('.title').html(event.subtitle);
            $schedulePopup.find('.description').html(event.description);

            self.buildSpeakerHTMLs(speakers).forEach(
                function (html) {
                    $schedulePopup.find('.speakers').append(html);
                }
            );

            twttr.widgets.load();
            $schedulePopup.modal({
                onOpen: function (dialog) {
                    dialog.overlay.fadeIn('fast', function () {
                        dialog.container.slideDown('fast', function () {
                            dialog.data.fadeIn('fast');
                        });
                    });
                },
                opacity: 60,
                overlayCss: {backgroundColor: '#000000'}
            });
            $schedulePopup.css('top', '100px');
        });
    },
    render: function () {
        var timelineRows = [];
        var self = this;

        if(this.props.timelines) {
            var tagColorMap = {};

            this.props.timelines.forEach(function (timeline) {
                timeline.events.forEach(function (event) {
                    if(event.tags) {
                        event.tags.forEach(function (tag) {
                            tagColorMap[tag] = null;
                        });
                    }
                });
            });

            var colors = [
                'orchid',
                'navy',
                'orange',
                'magenta',
                'brown',
                'aqua',
                'chocolate',
                'plum',
                'salmon',
                'sea-green',
                'state-blue',
                'yellow-green',
                'dark-slate-gray'
            ];

            var colorId = 0;
            for(key in tagColorMap) {
                if(tagColorMap.hasOwnProperty(key)) {
                    tagColorMap[key] = colors[colorId];
                    colorId++;
                }
            }

            function buildTimeline(timeline, i) {
                timelineRows.push(React.createElement(Timeline, {
                    timelineId: i, 
                    timeline: timeline, 
                    speakers: self.props.speakers, 
                    key: i, 
                    handleTagSelect: self.handleTagSelect, 
                    selectedTags: self.state.selectedTags, 
                    tagColorMap: tagColorMap}
                ));
            }

            this.props.timelines.forEach(buildTimeline.bind(this));

            return React.createElement("tbody", null, timelineRows)
        } else {
            return null;
        }
    }
});

var EventPopup = React.createClass({
    displayName: "EventPopup",
    render: function () {
        return (
            React.createElement("div", {id: "schedule-popup"}, 
                React.createElement("header", null, 
                    React.createElement("div", {className: "close"}), 
                    React.createElement("img", {src: "assets/img/logo2.png"})
                ), 
                React.createElement("section", {className: "content"}, 
                    React.createElement("div", {className: "title"}), 
                    React.createElement("div", {className: "description"}), 
                    React.createElement("ul", {className: "speakers"})
                )
            )
        );
    }
});

var Schedule = React.createClass({
    displayName: 'Schedule',
    getInitialState: function () {
        return {
            roomNames: [],
            schedule: [],
            speakers: {}
        }
    },
    componentWillMount: function () {
        var self = this;
        storage.getSpeakers(function (speakers) {
            var speakersMap = {};
            speakers.forEach(function (speaker) {
                speakersMap[speaker['id']] = speaker;
            });
            storage.getSchedule(function (schedule) {
                schedule['speakers'] = speakersMap;
                self.setState(schedule);
            });
        });
    },
    render: function () {
        return (
            React.createElement("div", null, 
                React.createElement("article", {className: "schedule-section"}, 
                    React.createElement("table", null, 
                        React.createElement(ScheduleRoomNames, {roomNames: this.state.roomNames}), 
                        React.createElement(TimelineList, {timelines: this.state.schedule, speakers: this.state.speakers})
                    )
                ), 
                React.createElement(EventPopup, null)
            )
        );
    }
});

