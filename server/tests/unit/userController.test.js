'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const userController = require('../../src/controllers/userController');
const userModel = require('../../src/models/userModel');
const authService = require('../../src/services/authService');
const db = require('../../src/config/db');
const AppError = require('../../src/utils/AppError');

function makeRes() {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
}

describe('userController (Unit Tests)', () => {
  beforeEach(() => {
    sinon.stub(db, 'transaction').callsFake(async (cb) => {
      return cb({ execute: sinon.stub().resolves() });
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  // ─── getProfile ─────────────────────────────────────────────────────────────
  describe('getProfile', () => {
    it('should return user profile when user exists', async () => {
      const req = { user: { userId: 1, email: 'user@example.com' } };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findById').resolves({
        id: 1,
        username: 'testuser',
        email: 'user@example.com',
      });

      await userController.getProfile(req, res, next);

      expect(res.json.calledOnce).to.equal(true);
      const payload = res.json.firstCall.args[0];
      expect(payload.success).to.equal(true);
      expect(payload.data.user.username).to.equal('testuser');
      expect(next.called).to.equal(false);
    });

    it('should call next with 404 when user does not exist', async () => {
      const req = { user: { userId: 999, email: 'missing@example.com' } };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findById').resolves(null);

      await userController.getProfile(req, res, next);

      expect(next.calledOnce).to.equal(true);
      const err = next.firstCall.args[0];
      expect(err).to.be.an.instanceOf(AppError);
      expect(err.statusCode).to.equal(404);
      expect(err.code).to.equal('USER_NOT_FOUND');
    });

    it('should forward database errors to next()', async () => {
      const req = { user: { userId: 1 } };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findById').rejects(new Error('DB failure'));

      await userController.getProfile(req, res, next);

      expect(next.calledOnce).to.equal(true);
      expect(next.firstCall.args[0].message).to.equal('DB failure');
    });
  });

  // ─── updateProfile ──────────────────────────────────────────────────────────
  describe('updateProfile', () => {
    it('should return 404 when user is not found', async () => {
      const req = {
        user: { userId: 1, email: 'user@example.com' },
        body: { username: 'newname' },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves(null);

      await userController.updateProfile(req, res, next);

      expect(next.calledOnce).to.equal(true);
      expect(next.firstCall.args[0].statusCode).to.equal(404);
    });

    it('should throw 400 PASSWORD_REQUIRED if changing email without current password', async () => {
      const req = {
        user: { userId: 1, email: 'old@example.com' },
        body: { email: 'new@example.com' },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves({
        id: 1,
        email: 'old@example.com',
        password_hash: 'hashed',
      });

      await userController.updateProfile(req, res, next);

      expect(next.calledOnce).to.equal(true);
      const err = next.firstCall.args[0];
      expect(err.statusCode).to.equal(400);
      expect(err.code).to.equal('PASSWORD_REQUIRED');
    });

    it('should throw 400 INVALID_PASSWORD if current password verification fails', async () => {
      const req = {
        user: { userId: 1, email: 'old@example.com' },
        body: { email: 'new@example.com', currentPassword: 'wrongpassword' },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves({
        id: 1,
        email: 'old@example.com',
        password_hash: 'hashed',
      });
      sinon.stub(authService, 'verifyPassword').resolves(false);

      await userController.updateProfile(req, res, next);

      expect(next.calledOnce).to.equal(true);
      const err = next.firstCall.args[0];
      expect(err.statusCode).to.equal(400);
      expect(err.code).to.equal('INVALID_PASSWORD');
    });

    it('should throw 400 SAME_PASSWORD before writing profile if newPassword equals currentPassword', async () => {
      const req = {
        user: { userId: 1, email: 'old@example.com' },
        body: {
          username: 'changedname',
          currentPassword: 'samePassword1',
          newPassword: 'samePassword1',
        },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves({
        id: 1,
        username: 'oldname',
        email: 'old@example.com',
        password_hash: 'hashed',
      });
      sinon.stub(authService, 'verifyPassword').resolves(true);
      const updateProfileSpy = sinon.spy(userModel, 'updateProfile');

      await userController.updateProfile(req, res, next);

      expect(next.calledOnce).to.equal(true);
      const err = next.firstCall.args[0];
      expect(err.statusCode).to.equal(400);
      expect(err.code).to.equal('SAME_PASSWORD');
      expect(updateProfileSpy.called).to.equal(false);
    });

    it('should throw 409 if new email is already in use by another user', async () => {
      const req = {
        user: { userId: 1, email: 'old@example.com' },
        body: { email: 'taken@example.com', currentPassword: 'correctpassword' },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves({
        id: 1,
        email: 'old@example.com',
        password_hash: 'hashed',
      });
      sinon.stub(userModel, 'findByEmail').withArgs('taken@example.com').resolves({
        id: 2,
        email: 'taken@example.com',
      });
      sinon.stub(authService, 'verifyPassword').resolves(true);

      await userController.updateProfile(req, res, next);

      expect(next.calledOnce).to.equal(true);
      const err = next.firstCall.args[0];
      expect(err.statusCode).to.equal(409);
      expect(err.code).to.equal('DUPLICATE_ENTRY');
    });

    it('should throw 409 if new username is already taken by another user', async () => {
      const req = {
        user: { userId: 1, email: 'user@example.com' },
        body: { username: 'takenname' },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves({
        id: 1,
        username: 'oldname',
        email: 'user@example.com',
      });
      sinon.stub(userModel, 'findByUsername').resolves({
        id: 2,
        username: 'takenname',
      });

      await userController.updateProfile(req, res, next);

      expect(next.calledOnce).to.equal(true);
      const err = next.firstCall.args[0];
      expect(err.statusCode).to.equal(409);
      expect(err.code).to.equal('DUPLICATE_ENTRY');
    });

    it('should update profile and change password successfully within transaction', async () => {
      const req = {
        user: { userId: 1, email: 'user@example.com' },
        body: {
          username: 'updatedname',
          currentPassword: 'oldPassword1',
          newPassword: 'newPassword2',
        },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves({
        id: 1,
        username: 'oldname',
        email: 'user@example.com',
        password_hash: 'hashed',
      });
      sinon.stub(userModel, 'findByUsername').resolves(null);
      sinon.stub(authService, 'verifyPassword').resolves(true);
      sinon.stub(authService, 'hashPassword').resolves('newhashed');
      sinon.stub(userModel, 'updatePassword').resolves();
      sinon.stub(userModel, 'updateProfile').resolves();
      sinon.stub(userModel, 'findById').resolves({
        id: 1,
        username: 'updatedname',
        email: 'user@example.com',
      });

      await userController.updateProfile(req, res, next);

      expect(res.json.calledOnce).to.equal(true);
      const payload = res.json.firstCall.args[0];
      expect(payload.success).to.equal(true);
      expect(payload.data.user.username).to.equal('updatedname');
      expect(next.called).to.equal(false);
    });
  });

  // ─── changePassword ─────────────────────────────────────────────────────────
  describe('changePassword', () => {
    it('should return 404 when user is not found', async () => {
      const req = {
        user: { userId: 1, email: 'missing@example.com' },
        body: { currentPassword: 'p1', newPassword: 'p2' },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves(null);

      await userController.changePassword(req, res, next);

      expect(next.calledOnce).to.equal(true);
      expect(next.firstCall.args[0].statusCode).to.equal(404);
    });

    it('should throw 400 SAME_PASSWORD when new password matches current password', async () => {
      const req = {
        user: { userId: 1, email: 'user@example.com' },
        body: { currentPassword: 'samePassword1', newPassword: 'samePassword1' },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves({
        id: 1,
        email: 'user@example.com',
        password_hash: 'hash',
      });
      sinon.stub(authService, 'verifyPassword').resolves(true);

      await userController.changePassword(req, res, next);

      expect(next.calledOnce).to.equal(true);
      const err = next.firstCall.args[0];
      expect(err.statusCode).to.equal(400);
      expect(err.code).to.equal('SAME_PASSWORD');
    });

    it('should change password successfully', async () => {
      const req = {
        user: { userId: 1, email: 'user@example.com' },
        body: { currentPassword: 'oldPassword1', newPassword: 'newPassword2' },
      };
      const res = makeRes();
      const next = sinon.spy();

      sinon.stub(userModel, 'findByIdWithPassword').resolves({
        id: 1,
        email: 'user@example.com',
        password_hash: 'hash',
      });
      sinon.stub(authService, 'verifyPassword').resolves(true);
      sinon.stub(authService, 'hashPassword').resolves('newhash');
      sinon.stub(userModel, 'updatePassword').resolves();

      await userController.changePassword(req, res, next);

      expect(res.json.calledOnce).to.equal(true);
      const payload = res.json.firstCall.args[0];
      expect(payload.success).to.equal(true);
      expect(payload.message).to.include('successfully');
      expect(next.called).to.equal(false);
    });
  });
});
