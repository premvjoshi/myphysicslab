// Copyright 2016 Erik Neumann.  All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

goog.provide('myphysicslab.sims.engine2D.ContactApp');

goog.require('myphysicslab.lab.controls.NumericControl');
goog.require('myphysicslab.lab.engine2D.ConcreteVertex');
goog.require('myphysicslab.lab.engine2D.ContactSim');
goog.require('myphysicslab.lab.model.DampingLaw');
goog.require('myphysicslab.lab.model.GravityLaw');
goog.require('myphysicslab.lab.engine2D.Polygon');
goog.require('myphysicslab.lab.engine2D.RigidBody');
goog.require('myphysicslab.lab.engine2D.Shapes');
goog.require('myphysicslab.lab.engine2D.ThrusterSet');
goog.require('myphysicslab.lab.engine2D.Walls');
goog.require('myphysicslab.lab.model.CollisionAdvance');
goog.require('myphysicslab.lab.util.DoubleRect');
goog.require('myphysicslab.lab.util.ParameterNumber');
goog.require('myphysicslab.lab.util.UtilityCore');
goog.require('myphysicslab.lab.util.Vector');
goog.require('myphysicslab.lab.view.DisplayShape');
goog.require('myphysicslab.sims.engine2D.Engine2DApp');
goog.require('myphysicslab.sims.engine2D.SixThrusters');
goog.require('myphysicslab.sims.layout.CommonControls');
goog.require('myphysicslab.sims.layout.TabLayout');

goog.scope(function() {

var lab = myphysicslab.lab;
var sims = myphysicslab.sims;

var NumericControl = lab.controls.NumericControl;
var CollisionAdvance = lab.model.CollisionAdvance;
var CommonControls = sims.layout.CommonControls;
var ConcreteVertex = lab.engine2D.ConcreteVertex;
var ContactSim = lab.engine2D.ContactSim;
var DampingLaw = lab.model.DampingLaw;
var DisplayShape = lab.view.DisplayShape;
var DoubleRect = lab.util.DoubleRect;
var Engine2DApp = sims.engine2D.Engine2DApp;
var GravityLaw = lab.model.GravityLaw;
var ParameterNumber = lab.util.ParameterNumber;
var Polygon = lab.engine2D.Polygon;
var Shapes = lab.engine2D.Shapes;
var SixThrusters = sims.engine2D.SixThrusters;
var UtilityCore = lab.util.UtilityCore;
var Vector = lab.util.Vector;
var Walls = lab.engine2D.Walls;

/**  ContactApp demonstrates ContactSim with a set of simple rectangular objects.

This sim has a config() function which looks at a set of options
and rebuilds the simulation accordingly. UI controls are created to change the options.

* @param {!sims.layout.TabLayout.elementIds} elem_ids specifies the names of the HTML
*    elementId's to look for in the HTML document; these elements are where the user
*    interface of the simulation is created.
* @constructor
* @final
* @struct
* @extends {Engine2DApp}
* @export
*/
sims.engine2D.ContactApp = function(elem_ids) {
  var simRect = new DoubleRect(-4.5, -3.6, 3.1, 4);
  this.mySim = new ContactSim();
  var advance = new CollisionAdvance(this.mySim);
  Engine2DApp.call(this, elem_ids, simRect, this.mySim, advance);
  this.mySim.setShowForces(true);
  /** @type {!lab.model.DampingLaw} */
  this.dampingLaw = new DampingLaw(0, 0.1, this.simList);
  /** @type {!lab.model.GravityLaw} */
  this.gravityLaw = new GravityLaw(3, this.simList);
  this.elasticity.setElasticity(0.8);
  /** @type {number} */
  this.numBods = 6;
  /** @type {number} */
  this.thrust = 1.5;
  /** @type {!lab.engine2D.ThrusterSet} */
  this.thrust1;
  /** @type {!lab.engine2D.ThrusterSet} */
  this.thrust2;

  this.addPlaybackControls();

  /** @type {!lab.util.ParameterNumber} */
  var pn;
  this.addParameter(pn = new ParameterNumber(this, ContactApp.en.NUM_BODIES,
      ContactApp.i18n.NUM_BODIES,
      this.getNumBods, this.setNumBods).setDecimalPlaces(0));
  this.addControl(new NumericControl(pn));

  this.addParameter(pn = new ParameterNumber(this, ContactApp.en.THRUST,
      ContactApp.i18n.THRUST,
      this.getThrust, this.setThrust));
  this.addControl(new NumericControl(pn));

  pn = this.gravityLaw.getParameterNumber(GravityLaw.en.GRAVITY);
  this.addControl(new NumericControl(pn));
  this.watchEnergyChange(pn);

  pn = this.dampingLaw.getParameterNumber(DampingLaw.en.DAMPING);
  this.addControl(new NumericControl(pn));

  this.addStandardControls();

  this.makeScriptParser();
  this.addURLScriptButton();
  this.config();
  this.graphSetup();
};
var ContactApp = sims.engine2D.ContactApp;
goog.inherits(ContactApp, Engine2DApp);

if (!UtilityCore.ADVANCED) {
  /** @inheritDoc */
  ContactApp.prototype.toString = function() {
    return this.toStringShort().slice(0, -1)
        +', dampingLaw: '+this.dampingLaw.toStringShort()
        +', gravityLaw: '+this.gravityLaw.toStringShort()
        + ContactApp.superClass_.toString.call(this);
  };
};

/** @inheritDoc */
ContactApp.prototype.getClassName = function() {
  return 'ContactApp';
};

/** @inheritDoc */
ContactApp.prototype.defineNames = function(myName) {
  ContactApp.superClass_.defineNames.call(this, myName);
  this.terminal.addRegex('gravityLaw|dampingLaw',
       myName);
  this.terminal.addRegex('ContactApp|Engine2DApp',
       'myphysicslab.sims.engine2D', /*addToVars=*/false);
};

/** @inheritDoc */
ContactApp.prototype.getSubjects = function() {
  var subjects = ContactApp.superClass_.getSubjects.call(this);
  return goog.array.concat(this.dampingLaw, this.gravityLaw, subjects);
};

/**
* @return {undefined}
*/
ContactApp.prototype.config = function() {
  var elasticity = this.elasticity.getElasticity();
  this.mySim.cleanSlate();
  Polygon.ID = 1;
  this.advance.reset();
  this.mySim.addForceLaw(this.dampingLaw);
  this.dampingLaw.connect(this.mySim.getSimList());
  this.mySim.addForceLaw(this.gravityLaw);
  this.gravityLaw.connect(this.mySim.getSimList());
  DisplayShape.fillStyle = 'gray';
  var zel = Walls.make2(this.mySim, this.simView.getSimRect());
  this.gravityLaw.setZeroEnergyLevel(zel);
  /** @type {!lab.engine2D.RigidBody} */
  var p;
  DisplayShape.nameFont = '10pt sans-serif';
  if (this.numBods >= 1) {
    DisplayShape.fillStyle = 'cyan';
    p = Shapes.makeRandomPolygon(/*sides=*/4, /*radius=*/1);
    p.setPosition(new Vector(-3.4,  0),  0);
    p.setVelocity(new Vector(0.3858,  -0.3608),  -0.3956);
    this.mySim.addBody(p);
    this.thrust2 = SixThrusters.make(this.thrust, p);
    this.rbeh.setThrusters(this.thrust2, 'left');
    this.mySim.addForceLaw(this.thrust2);
  }
  if (this.numBods >= 2) {
    DisplayShape.fillStyle = 'orange';
    p = Shapes.makeBlock(1, 3);
    p.setPosition(new Vector(-1.8,  0),  0);
    p.setVelocity(new Vector(0.26993,  -0.01696),  -0.30647);
    this.mySim.addBody(p);
    this.thrust1 = SixThrusters.make(this.thrust, p);
    this.rbeh.setThrusters(this.thrust1, 'right');
    this.mySim.addForceLaw(this.thrust1);
  }
  if (this.numBods >= 3) {
    DisplayShape.fillStyle = '#9f3'; // light green
    p = Shapes.makeRandomPolygon(/*sides=*/4, /*radius=*/1);
    //p = Shapes.makeBlock('block 3', 1, 3);
    p.setPosition(new Vector(2,  -0.113),  0);
    p.setVelocity(new Vector(-0.29445,  -0.11189),  -0.23464);
    this.mySim.addBody(p);
  }
  if (this.numBods >= 4) {
    DisplayShape.fillStyle = '#f6c'; // hot pink
    p = Shapes.makeBlock(1, 3);
    p.setPosition(new Vector(1.36,  2.5),  -Math.PI/4);
    p.setVelocity(new Vector(-0.45535,  -0.37665),  0.36526);
    this.mySim.addBody(p);
  }
  if (this.numBods >= 5) {
    DisplayShape.fillStyle = '#39f';
    p = Shapes.makeBlock(1, 3);
    p.setPosition(new Vector(-2,  2.5),  Math.PI/2+0.1);
    this.mySim.addBody(p);
  }
  if (this.numBods >= 6) {
    DisplayShape.fillStyle = '#c99';
    p = Shapes.makeRandomPolygon(/*sides=*/4, /*radius=*/1);
    //p = Shapes.makeBlock('block 6', 1, 3);
    p.setPosition(new Vector(0,  0),  0);
    this.mySim.addBody(p);
  }
  this.mySim.setElasticity(elasticity);
  this.mySim.getVarsList().setTime(0);
  this.mySim.saveInitialState();
  this.clock.setTime(0);
  this.clock.setRealTime(0);
  this.scriptParser.update();
};

/**
* @return {number}
*/
ContactApp.prototype.getNumBods = function() {
  return this.numBods;
};

/**
* @param {number} value
*/
ContactApp.prototype.setNumBods = function(value) {
  this.numBods = value;
  this.config();
  this.broadcastParameter(ContactApp.en.NUM_BODIES);
};

/**
* @return {number}
*/
ContactApp.prototype.getThrust = function() {
  return this.thrust;
};

/**
* @param {number} value
*/
ContactApp.prototype.setThrust = function(value) {
  this.thrust = value;
  this.thrust1.setMagnitude(value);
  this.thrust2.setMagnitude(value);
  this.broadcastParameter(ContactApp.en.THRUST);
};

/** Set of internationalized strings.
@typedef {{
  NUM_BODIES: string,
  THRUST: string
  }}
*/
ContactApp.i18n_strings;

/**
@type {ContactApp.i18n_strings}
*/
ContactApp.en = {
  NUM_BODIES: 'number of objects',
  THRUST: 'thrust'
};

/**
@private
@type {ContactApp.i18n_strings}
*/
ContactApp.de_strings = {
  NUM_BODIES: 'Anzahl von Objekten',
  THRUST: 'Schubkraft'
};

/** Set of internationalized strings.
@type {ContactApp.i18n_strings}
*/
ContactApp.i18n = goog.LOCALE === 'de' ? ContactApp.de_strings :
    ContactApp.en;

}); // goog.scope