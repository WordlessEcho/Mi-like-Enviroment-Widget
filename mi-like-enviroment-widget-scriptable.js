// Get token in [Your Home Assistant profile] -> Long-Lived Access Tokens
const hassApi = {
  address: "http://example.com:8123",
  token: "SECRET"
};

// Text showing on top
const homeName = "Home";
const accentColor = { hex: "#5eb8be", alpha: 1.0 };

const censors = [
  // Data will be display as "PM 2.5: 1ug/m³"
  // Check your entity_id at Configuration -> Devices & Services -> Entities

  {
    entity_id: "sensor.example_temperature",
    prefix: "",
    suffix: "°"
  },
  {
    entity_id: "sensor.example_humidity",
    prefix: "",
    suffix: "%"
  },
  {
    entity_id: "sensor.example_pm2_5",
    prefix: "PM 2.5: ",
    suffix: "ug/m³"
  }
];

// https://developers.home-assistant.io/docs/api/rest/
const getStates = async () => {
  const request = new Request(`${hassApi.address}/api/states`);
  request.headers = {
    "Authorization": `Bearer ${hassApi.token}`,
    "content-type": "application/json"
  };

  return await request.loadJSON();
};

const getValues = (entities) => {
  return entities
    .filter(entity => censors.map(censor => censor.entity_id).includes(entity.entity_id))
    // Keep entity_id and state only in array
    .map(({ entity_id, state }) => ({ entity_id, state }));
};

const mergeString = (values) => {
  const stringArray = [];

  censors.forEach(censor => {
    values.forEach(value => {
      if (censor.entity_id === value.entity_id) {
        // Put prefix, state and suffix together
        stringArray.push(`${censor.prefix}${value.state}${censor.suffix}`);
      }
    });
  });

  return stringArray;
}

const createWidget = async () => {
  // Create the widget
  const widget = new ListWidget();

  // Show home name at header
  const headerStack = widget.addStack();

  const header = headerStack.addText(homeName);
  header.textColor = new Color(accentColor.hex, accentColor.alpha);
  header.font = Font.systemFont(15);

  // Initialize values
  const states = await getStates();
  const strings = mergeString(getValues(states));
  const iterator = strings.values();

  // Bottom align other stacks
  widget.addSpacer();

  const bodyStack = widget.addStack();

  // No info
  if (typeof strings === 'undefined' || strings.length <= 0) {
    bodyStack.addText('Did you set entity_id of censors?');

    return widget;
  }

  // Biggest info
  const mainValue = iterator.next().value

  const main = bodyStack.addText(mainValue);
  main.font = Font.mediumSystemFont(45);

  // Bottom info. Will be like: "1% | AQI 10"
  // TODO: Support multiple values?
  const leftValue = iterator.next().value;

  if (!!leftValue) {
    const footerStack = widget.addStack();
    const leftFooterStack = footerStack.addStack();

    const left = leftFooterStack.addText(leftValue);
    left.font = Font.systemFont(13);

    const rightValue = iterator.next().value;

    if (!!rightValue) {
      const spliter = footerStack.addStack();
      const rightFooterStack = footerStack.addStack();

      const split = spliter.addText(" | ");
      split.font = Font.systemFont(13);
    
      const right = rightFooterStack.addText(rightValue);
      right.font = Font.systemFont(13);
    }
  }

  return widget;
};

// Thanks to https://github.com/m33x
// https://community.home-assistant.io/t/ios-widget-for-home-assistant-via-scriptable/284142
// https://gist.github.com/m33x/62f6e8f6eab546e4b3a854695ea8c3a8
const widget = await createWidget();
if (!config.runsInWidget) {
    await widget.presentSmall();
}

Script.setWidget(widget);
Script.complete();
